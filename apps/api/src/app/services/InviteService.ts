import { GroupRole } from '@bzim/types';
import type { GroupInviteDto } from '@bzim/types';

import { AppDataSource } from '../../database/typeorm-db';
import type Group from '../models/Group.entity';
import GroupInvite from '../models/GroupInvite.entity';
import GroupMember from '../models/GroupMember.entity';
import User from '../models/User.entity';
import { NotificationService } from './NotificationService';

export type InviteProblem = 'USER_NOT_FOUND' | 'ALREADY_MEMBER' | 'ALREADY_INVITED';

export type InviteResult =
    { ok: true; invite: GroupInviteDto } | { ok: false; problem: InviteProblem };

/** Every relation `toDto()` needs, so a loaded invite is always presentable. */
const RELATIONS = { group: true, invitedUser: true, invitedBy: true } as const;

/**
 * Invitations by handle. A row is the pending state; accepting turns it into
 * a membership in the same transaction, declining and cancelling just remove it.
 */
export class InviteService {
    /** Admin action. The invitee is found by handle and told by email. */
    static async invite(group: Group, inviter: User, handle: string): Promise<InviteResult> {
        const invitee = await User.findOneBy({ handle });
        if (invitee === null) {
            return { ok: false, problem: 'USER_NOT_FOUND' };
        }
        if (await GroupMember.existsBy({ groupId: group.id, userId: invitee.id })) {
            return { ok: false, problem: 'ALREADY_MEMBER' };
        }
        if (await GroupInvite.existsBy({ groupId: group.id, invitedUserId: invitee.id })) {
            return { ok: false, problem: 'ALREADY_INVITED' };
        }

        const created = await GroupInvite.create({
            groupId: group.id,
            invitedUserId: invitee.id,
            invitedById: inviter.id,
        }).save();
        const invite = await GroupInvite.findOneOrFail({
            where: { id: created.id },
            relations: RELATIONS,
        });

        await NotificationService.groupInvited(invite);
        return { ok: true, invite: invite.toDto() };
    }

    /** Pending invites of one group, oldest first, for its admins. */
    static async listForGroup(group: Group): Promise<GroupInviteDto[]> {
        const invites = await GroupInvite.find({
            where: { groupId: group.id },
            relations: RELATIONS,
            order: { createdAt: 'ASC' },
        });
        return invites.map((invite) => invite.toDto());
    }

    /** Everything waiting for this person's answer, newest first. */
    static async listForUser(user: User): Promise<GroupInviteDto[]> {
        const invites = await GroupInvite.find({
            where: { invitedUserId: user.id },
            relations: RELATIONS,
            order: { createdAt: 'DESC' },
        });
        return invites.map((invite) => invite.toDto());
    }

    /** Admin action. Null when the invite is not this group's. */
    static async cancel(group: Group, inviteId: string): Promise<boolean> {
        const result = await GroupInvite.delete({ id: inviteId, groupId: group.id });
        return (result.affected ?? 0) > 0;
    }

    /** The invitee's own invite, or null; nobody else can see or answer it. */
    static findForUser(inviteId: string, user: User): Promise<GroupInvite | null> {
        return GroupInvite.findOne({
            where: { id: inviteId, invitedUserId: user.id },
            relations: RELATIONS,
        });
    }

    /**
     * Membership and removal of the invite happen together, or not at all.
     * Somebody who got in another way meanwhile (a link, a public join) is
     * simply a member already; the invite goes just the same.
     */
    static async accept(invite: GroupInvite): Promise<GroupMember> {
        return AppDataSource.transaction(async (manager) => {
            const existing = await manager.findOneBy(GroupMember, {
                groupId: invite.groupId,
                userId: invite.invitedUserId,
            });
            if (existing !== null) {
                await manager.remove(invite);
                return existing;
            }
            const membership = await manager.save(
                manager.create(GroupMember, {
                    groupId: invite.groupId,
                    userId: invite.invitedUserId,
                    role: GroupRole.MEMBER,
                }),
            );
            await manager.remove(invite);
            return membership;
        });
    }

    static async decline(invite: GroupInvite): Promise<void> {
        await invite.remove();
    }
}
