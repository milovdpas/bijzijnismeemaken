import { GroupRole } from '@bzim/types';
import type {
    GroupDetailResponse,
    GroupListingResponse,
    InviteLinkResponse,
    JoinPreviewResponse,
    Paginated,
    PublicGroupResponse,
} from '@bzim/types';

import type { Handler } from '../interfaces/IHttp';
import { paramsOf, queryOf } from '../middleware/ValidateRequest';
import type { BodyOf } from '../middleware/ValidateRequest';
import GroupMember from '../../domain/models/GroupMember.entity';
import GroupPresenter from '../../domain/presenters/GroupPresenter';
import { GroupService } from '../../domain/services/GroupService';
import { sendConflict, sendNoContent, sendNotFound, sendSuccess } from '../utils/ApiResponses';
import { paginate } from '../utils/Pagination';
import { groupIdParamSchema } from '../validators/commonSchemas';
import {
    createGroupSchema,
    joinTokenParamSchema,
    publicGroupsQuerySchema,
    updateGroupSchema,
} from '../validators/groupSchemas';

/** Groups as a whole: listing, finding, creating, joining, settings. */
export default class GroupController {
    list: Handler = async (req, res) => {
        sendSuccess<GroupListingResponse[]>(res, await GroupService.listForUser(req.user));
    };

    create: Handler<BodyOf<typeof createGroupSchema>> = async (req, res) => {
        const { name, description, imageUrl, imageCreditName, imageCreditUrl, access } = req.body;
        const group = await GroupService.create(req.user, {
            name,
            description,
            imageUrl,
            imageCreditName,
            imageCreditUrl,
            access,
        });
        sendSuccess<GroupDetailResponse>(
            res,
            GroupPresenter.detail(group, GroupRole.OWNER, await group.memberCount()),
            201,
        );
    };

    searchPublic: Handler = async (req, res) => {
        const { q, page, pageSize } = queryOf(req, publicGroupsQuerySchema);
        const result = await GroupService.searchPublic(q, page, pageSize);
        sendSuccess<Paginated<PublicGroupResponse>>(
            res,
            paginate(result.items, result.total, page, pageSize),
        );
    };

    /** `requireGroupRole` has already loaded the group and the membership. */
    detail: Handler = async (req, res) => {
        sendSuccess<GroupDetailResponse>(
            res,
            GroupPresenter.detail(req.group, req.membership.role, await req.group.memberCount()),
        );
    };

    update: Handler<BodyOf<typeof updateGroupSchema>> = async (req, res) => {
        const { name, description, imageUrl, imageCreditName, imageCreditUrl, access } = req.body;
        const group = await GroupService.update(req.group, {
            name,
            description,
            imageUrl,
            imageCreditName,
            imageCreditUrl,
            access,
        });
        sendSuccess<GroupDetailResponse>(
            res,
            GroupPresenter.detail(group, req.membership.role, await group.memberCount()),
        );
    };

    delete: Handler = async (req, res) => {
        await GroupService.delete(req.group);
        sendNoContent(res);
    };

    /**
     * Joining a public group by id. A private group answers 404 here exactly
     * as it would anywhere else; its door is the invite link or an invite.
     */
    join: Handler = async (req, res) => {
        const { groupId } = paramsOf(req, groupIdParamSchema);
        const group = await GroupService.findPublic(groupId);
        if (group === null) {
            sendNotFound(res, 'Group');
            return;
        }
        const result = await GroupService.join(group, req.user);
        if (!result.ok) {
            sendConflict(res, 'Already a member');
            return;
        }
        sendSuccess<GroupDetailResponse>(
            res,
            GroupPresenter.detail(group, GroupRole.MEMBER, await group.memberCount()),
            201,
        );
    };

    regenerateInviteLink: Handler = async (req, res) => {
        const group = await GroupService.regenerateInviteToken(req.group);
        sendSuccess<InviteLinkResponse>(res, { inviteLink: group.inviteLink() ?? '' });
    };

    /** What the link shows. Unknown or retired token: 404, nothing to preview. */
    previewByToken: Handler = async (req, res) => {
        const { token } = paramsOf(req, joinTokenParamSchema);
        const group = await GroupService.findByInviteToken(token);
        if (group === null) {
            sendNotFound(res, 'Invite link');
            return;
        }
        const alreadyMember = await GroupMember.existsBy({
            groupId: group.id,
            userId: req.user.id,
        });
        sendSuccess<JoinPreviewResponse>(
            res,
            GroupPresenter.joinPreview(group, await group.memberCount(), alreadyMember),
        );
    };

    joinByToken: Handler = async (req, res) => {
        const { token } = paramsOf(req, joinTokenParamSchema);
        const group = await GroupService.findByInviteToken(token);
        if (group === null) {
            sendNotFound(res, 'Invite link');
            return;
        }
        const result = await GroupService.join(group, req.user);
        if (!result.ok) {
            sendConflict(res, 'Already a member');
            return;
        }
        sendSuccess<GroupDetailResponse>(
            res,
            GroupPresenter.detail(group, GroupRole.MEMBER, await group.memberCount()),
            201,
        );
    };
}
