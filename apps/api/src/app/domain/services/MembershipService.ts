import { GroupRole } from '@bzim/types';
import type { GroupMemberResponse } from '@bzim/types';

import { AppDataSource } from '../../../database/typeorm-db';
import Group from '../models/Group.entity';
import GroupInvite from '../models/GroupInvite.entity';
import GroupMember, { roleRank } from '../models/GroupMember.entity';
import { DepartureService } from './DepartureService';

/** The refusals an action on another member can answer with. */
export type MemberActionProblem = 'NOT_A_MEMBER' | 'FORBIDDEN' | 'CANNOT_TARGET_SELF';

/** Each method names exactly the problems it can produce, so a controller's switch lists only real cases. */
export type MembershipResult<P extends string> = { ok: true } | { ok: false; problem: P };

/**
 * Who is in a group and what they may do to each other.
 *
 * The rules, from docs/05: admins manage members but never other admins or
 * the owner; only the owner promotes, demotes, transfers and deletes; the
 * owner cannot leave without handing the group to somebody first.
 */
export class MembershipService {
    /**
     * Members by display name (the database collation makes that case-insensitive),
     * response-ready. Putting the owner and admins on top is a presentation
     * choice the screen makes from `role`, not an order the API imposes.
     */
    static async list(group: Group): Promise<GroupMemberResponse[]> {
        const members = await GroupMember.find({
            where: { groupId: group.id },
            relations: { user: true },
            order: { user: { displayName: 'ASC' }, joinedAt: 'ASC' },
        });
        return members.map((member) => member.toDto());
    }

    /**
     * Owner only. Promotes a member to admin or demotes an admin to member;
     * the owner role itself only moves through `transferOwnership`.
     */
    static async changeRole(
        group: Group,
        actor: GroupMember,
        targetUserId: string,
        role: GroupRole.ADMIN | GroupRole.MEMBER,
    ): Promise<MembershipResult<MemberActionProblem>> {
        if (actor.role !== GroupRole.OWNER) {
            return { ok: false, problem: 'FORBIDDEN' };
        }
        if (targetUserId === actor.userId) {
            return { ok: false, problem: 'CANNOT_TARGET_SELF' };
        }
        const target = await GroupMember.findOneBy({ groupId: group.id, userId: targetUserId });
        if (target === null) {
            return { ok: false, problem: 'NOT_A_MEMBER' };
        }
        target.role = role;
        await target.save();
        return { ok: true };
    }

    /**
     * Admins remove members; the owner removes anyone but themselves. What
     * the removed person leaves behind is detached as if they had left.
     */
    static async remove(
        group: Group,
        actor: GroupMember,
        targetUserId: string,
    ): Promise<MembershipResult<MemberActionProblem>> {
        if (targetUserId === actor.userId) {
            return { ok: false, problem: 'CANNOT_TARGET_SELF' };
        }
        const target = await GroupMember.findOneBy({ groupId: group.id, userId: targetUserId });
        if (target === null) {
            return { ok: false, problem: 'NOT_A_MEMBER' };
        }
        if (!actor.hasRole(GroupRole.ADMIN) || roleRank(target.role) >= roleRank(actor.role)) {
            return { ok: false, problem: 'FORBIDDEN' };
        }
        const cancelled = await AppDataSource.transaction(async (manager) => {
            await manager.delete(GroupInvite, { groupId: group.id, invitedUserId: targetUserId });
            await manager.remove(target);
            return DepartureService.detach(manager, group, targetUserId);
        });
        await DepartureService.notify(group, cancelled);
        return { ok: true };
    }

    /** Owner only. The old owner stays on as an admin. */
    static async transferOwnership(
        group: Group,
        actor: GroupMember,
        targetUserId: string,
    ): Promise<MembershipResult<MemberActionProblem>> {
        if (actor.role !== GroupRole.OWNER) {
            return { ok: false, problem: 'FORBIDDEN' };
        }
        if (targetUserId === actor.userId) {
            return { ok: false, problem: 'CANNOT_TARGET_SELF' };
        }
        const target = await GroupMember.findOneBy({ groupId: group.id, userId: targetUserId });
        if (target === null) {
            return { ok: false, problem: 'NOT_A_MEMBER' };
        }

        await AppDataSource.transaction(async (manager) => {
            target.role = GroupRole.OWNER;
            actor.role = GroupRole.ADMIN;
            group.ownerId = target.userId;
            await manager.save([target, actor, group]);
        });
        return { ok: true };
    }

    /**
     * Admins and members leave; the owner must transfer first. The membership
     * and any pending invites go, and what the leaver owned or was part of is
     * detached (docs/01 §1.6) in the same transaction.
     */
    static async leave(
        group: Group,
        actor: GroupMember,
    ): Promise<MembershipResult<'OWNER_MUST_TRANSFER'>> {
        if (actor.role === GroupRole.OWNER) {
            return { ok: false, problem: 'OWNER_MUST_TRANSFER' };
        }
        const cancelled = await AppDataSource.transaction(async (manager) => {
            await manager.delete(GroupInvite, { groupId: group.id, invitedUserId: actor.userId });
            await manager.remove(actor);
            return DepartureService.detach(manager, group, actor.userId);
        });
        await DepartureService.notify(group, cancelled);
        return { ok: true };
    }
}
