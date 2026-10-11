import { GroupRole } from '@bzim/types';
import type {
    GroupDetailResponse,
    GroupListingResponse,
    JoinPreviewResponse,
    PublicGroupResponse,
} from '@bzim/types';

import type Group from '../models/Group.entity';

/**
 * Maps a group plus what the caller knows about it (their role, the size,
 * whether they are in it) to the response shapes. An entity's `toDto()` only
 * covers its own columns; anything that composes more than one source lives
 * here, so the composition exists once and the controllers only send.
 */
export default class GroupPresenter {
    /** The caller's own list: the group and what they are in it. */
    static listing(group: Group, role: GroupRole, memberCount: number): GroupListingResponse {
        return { ...group.toDto(), role, memberCount };
    }

    /** The public overview, for people who are not in the group yet. */
    static publicListing(group: Group, memberCount: number): PublicGroupResponse {
        return { ...group.toDto(), memberCount };
    }

    /**
     * One group for one member. In a public group every member may share the
     * link (anyone could join anyway); in an invite-link group only those who
     * may regenerate it see it.
     */
    static detail(group: Group, role: GroupRole, memberCount: number): GroupDetailResponse {
        const mayShare = group.isPublic() || role === GroupRole.OWNER || role === GroupRole.ADMIN;
        return {
            ...GroupPresenter.listing(group, role, memberCount),
            inviteLink: mayShare ? group.inviteLink() : null,
        };
    }

    /** What an invite link shows before the person decides. */
    static joinPreview(
        group: Group,
        memberCount: number,
        alreadyMember: boolean,
    ): JoinPreviewResponse {
        return {
            id: group.id,
            name: group.name,
            description: group.description,
            memberCount,
            alreadyMember,
        };
    }
}
