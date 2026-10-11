import { In, Like } from 'typeorm';
import { GroupAccess, GroupRole, PAGINATION, slugify } from '@bzim/types';
import type { GroupInput, GroupListingResponse, PublicGroupResponse } from '@bzim/types';

import { AppDataSource } from '../../../database/typeorm-db';
import Activity from '../models/Activity.entity';
import Group from '../models/Group.entity';
import GroupInvite from '../models/GroupInvite.entity';
import GroupMember from '../models/GroupMember.entity';
import User from '../models/User.entity';
import GroupPresenter from '../presenters/GroupPresenter';
import { escapeLike } from '../../infrastructure/utils/Database';

import { generateToken } from '../../infrastructure/utils/Token';
import { OccurrenceService } from './OccurrenceService';
import { WidgetService } from './WidgetService';

export interface PublicPage {
    items: PublicGroupResponse[];
    total: number;
}

export type JoinResult =
    { ok: true; membership: GroupMember } | { ok: false; problem: 'ALREADY_MEMBER' };

/**
 * Groups themselves: creating, finding, listing, joining, settings. Who is in
 * one and what they may do is `MembershipService`.
 */
export class GroupService {
    /** The creator becomes the owner, in the same transaction as the group. */
    static async create(owner: User, input: GroupInput): Promise<Group> {
        return AppDataSource.transaction(async (manager) => {
            const group = manager.create(Group, {
                name: input.name,
                slug: slugify(input.name),
                description: input.description,
                imageUrl: input.imageUrl ?? null,
                imageCreditName: input.imageCreditName ?? null,
                imageCreditUrl: input.imageCreditUrl ?? null,
                access: input.access,
                inviteToken: Group.usesInviteLink(input.access) ? generateToken() : null,
                ownerId: owner.id,
            });
            await manager.save(group);
            await manager.save(
                manager.create(GroupMember, {
                    groupId: group.id,
                    userId: owner.id,
                    role: GroupRole.OWNER,
                }),
            );
            await WidgetService.seedDefaults(manager, group);
            return group;
        });
    }

    /** The group, if the caller is in it. Null otherwise, whether or not it exists. */
    static async findForMember(groupId: string, user: User): Promise<Group | null> {
        if (!(await GroupMember.existsBy({ groupId, userId: user.id }))) {
            return null;
        }
        return Group.findOneBy({ id: groupId });
    }

    /** Every group the caller is in, newest membership first, response-ready. */
    static async listForUser(user: User): Promise<GroupListingResponse[]> {
        const memberships = await GroupMember.find({
            where: { userId: user.id },
            relations: { group: true },
            order: { joinedAt: 'DESC' },
        });
        const counts = await Group.memberCounts(memberships.map((m) => m.groupId));
        return memberships.map((m) =>
            GroupPresenter.listing(m.group, m.role, counts.get(m.groupId) ?? 0),
        );
    }

    /** Public groups by name prefix or substring, paginated. */
    static async searchPublic(query: string, page: number, pageSize: number): Promise<PublicPage> {
        const size = Math.min(Math.max(pageSize, 1), PAGINATION.MAX_PAGE_SIZE);
        const [groups, total] = await Group.findAndCount({
            where: {
                access: GroupAccess.PUBLIC,
                ...(query === '' ? {} : { name: Like(`%${escapeLike(query)}%`) }),
            },
            order: { name: 'ASC' },
            skip: (Math.max(page, 1) - 1) * size,
            take: size,
        });
        const counts = await Group.memberCounts(groups.map((g) => g.id));
        return {
            items: groups.map((group) =>
                GroupPresenter.publicListing(group, counts.get(group.id) ?? 0),
            ),
            total,
        };
    }

    /** A public group by id, for joining through the overview. Private ones are not found here. */
    static findPublic(groupId: string): Promise<Group | null> {
        return Group.findOneBy({ id: groupId, access: GroupAccess.PUBLIC });
    }

    /** By invite token, for the link preview and the join. */
    static findByInviteToken(token: string): Promise<Group | null> {
        return Group.findOneBy({ inviteToken: token, access: In(Group.LINK_ACCESS) });
    }

    /**
     * Joining through the public list or an invite link. Which door was used
     * is the caller's business: by the time this runs, the group has been
     * found through a door that is open.
     */
    static async join(group: Group, user: User): Promise<JoinResult> {
        if (await GroupMember.existsBy({ groupId: group.id, userId: user.id })) {
            return { ok: false, problem: 'ALREADY_MEMBER' };
        }
        const membership = await GroupMember.create({
            groupId: group.id,
            userId: user.id,
            role: GroupRole.MEMBER,
        }).save();
        // An invite that was waiting for this person is answered by the join.
        await GroupInvite.delete({ groupId: group.id, invitedUserId: user.id });
        return { ok: true, membership };
    }

    /**
     * Settings. A rename refreshes the slug. Switching to invite-only voids the
     * token, so a link that was shared stops working the moment the group is no
     * longer meant to be joined that way; switching away from it mints a fresh
     * one. Public and invite-link groups both carry a link.
     */
    static async update(group: Group, patch: Partial<GroupInput>): Promise<Group> {
        if (patch.name !== undefined) {
            group.name = patch.name;
            group.slug = slugify(patch.name);
        }
        if (patch.description !== undefined) group.description = patch.description;
        if (patch.imageUrl !== undefined) group.imageUrl = patch.imageUrl;
        if (patch.imageCreditName !== undefined) group.imageCreditName = patch.imageCreditName;
        if (patch.imageCreditUrl !== undefined) group.imageCreditUrl = patch.imageCreditUrl;
        if (patch.access !== undefined && patch.access !== group.access) {
            group.access = patch.access;
            group.inviteToken = Group.usesInviteLink(patch.access) ? generateToken() : null;
        }
        return group.save();
    }

    /** A new token; the old link is dead from here on. */
    static async regenerateInviteToken(group: Group): Promise<Group> {
        group.inviteToken = generateToken();
        return group.save();
    }

    /** Everything under the group cascades in the database. */
    /** Every planned moment in the group is cancelled first; the rows then cascade with the group. */
    static async delete(group: Group): Promise<void> {
        const activities = await Activity.findBy({ groupId: group.id });
        for (const activity of activities) {
            await OccurrenceService.cancelAllPlanned(group, activity);
        }
        await group.remove();
    }
}
