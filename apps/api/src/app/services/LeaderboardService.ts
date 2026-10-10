import { DateTime } from 'luxon';
import { In } from 'typeorm';
import type { FindOptionsRelations } from 'typeorm';
import { EditMode, GroupRole, TIME_ZONE } from '@bzim/types';
import type { LeaderboardDetailDto, LeaderboardInput, LeaderboardListingDto } from '@bzim/types';

import { AppDataSource } from '../../database/typeorm-db';
import type Group from '../models/Group.entity';
import GroupMember from '../models/GroupMember.entity';
import Leaderboard from '../models/Leaderboard.entity';
import LeaderboardEditor from '../models/LeaderboardEditor.entity';
import LeaderboardMember from '../models/LeaderboardMember.entity';
import LeaderboardScoreHistory from '../models/LeaderboardScoreHistory.entity';
import LeaderboardScoreMonthly from '../models/LeaderboardScoreMonthly.entity';
import LeaderboardScoreTotal from '../models/LeaderboardScoreTotal.entity';
import LeaderboardScoreYearly from '../models/LeaderboardScoreYearly.entity';
import type User from '../models/User.entity';
import LeaderboardPresenter from '../presenters/LeaderboardPresenter';
import type { LeaderboardPermissions } from '../presenters/LeaderboardPresenter';

export type LeaderboardProblem =
    /** None of the three periods switched on; a board must show something. */
    | 'NO_PERIOD'
    /** An editor who is not in the group. */
    | 'EDITOR_NOT_MEMBER';

export type LeaderboardResult =
    { ok: true; leaderboard: Leaderboard } | { ok: false; problem: LeaderboardProblem };

export type AddMemberResult =
    | { ok: true; member: LeaderboardMember }
    | { ok: false; problem: 'NOT_A_GROUP_MEMBER' | 'NO_PROFILE' };

const RELATIONS: FindOptionsRelations<Leaderboard> = {
    createdBy: true,
    editors: { user: true },
    members: { user: true },
};

/**
 * Boards, their settings, who is on them and who may touch them (docs/05).
 * Scores are `ScoreService` (task 27); this never writes a score, but it is
 * the one that deletes them when a member is removed, since that is part of
 * what removal means.
 */
export class LeaderboardService {
    static async create(
        group: Group,
        creator: User,
        input: LeaderboardInput,
    ): Promise<LeaderboardResult> {
        if (!LeaderboardService.showsSomething(input)) {
            return { ok: false, problem: 'NO_PERIOD' };
        }
        const editorIds = input.editMode === EditMode.SELECTED ? (input.editorIds ?? []) : [];
        if (!(await LeaderboardService.allMembers(group, editorIds))) {
            return { ok: false, problem: 'EDITOR_NOT_MEMBER' };
        }
        const created = await AppDataSource.transaction(async (manager) => {
            const leaderboard = await manager.save(
                manager.create(Leaderboard, {
                    groupId: group.id,
                    createdById: creator.id,
                    creatorNameSnapshot: null,
                    name: input.name,
                    description: input.description ?? null,
                    scoreType: input.scoreType,
                    sortOrder: input.sortOrder,
                    editMode: input.editMode,
                    showMonthly: input.showMonthly,
                    showYearly: input.showYearly,
                    showAllTime: input.showAllTime,
                }),
            );
            await manager.save(
                [...new Set(editorIds)].map((userId) =>
                    manager.create(LeaderboardEditor, { leaderboardId: leaderboard.id, userId }),
                ),
            );
            return leaderboard;
        });
        return { ok: true, leaderboard: await LeaderboardService.reload(created.id) };
    }

    /** Settings. The editor list is replaced wholesale when given. */
    static async update(
        group: Group,
        leaderboard: Leaderboard,
        patch: Partial<LeaderboardInput>,
    ): Promise<LeaderboardResult> {
        const merged = { ...leaderboard, ...stripUndefined(patch) };
        if (!LeaderboardService.showsSomething(merged)) {
            return { ok: false, problem: 'NO_PERIOD' };
        }
        if (
            patch.editorIds !== undefined &&
            !(await LeaderboardService.allMembers(group, patch.editorIds))
        ) {
            return { ok: false, problem: 'EDITOR_NOT_MEMBER' };
        }
        Object.assign(leaderboard, stripUndefined({ ...patch, editorIds: undefined }));
        await AppDataSource.transaction(async (manager) => {
            await manager.save(leaderboard);
            if (patch.editorIds !== undefined) {
                await manager.delete(LeaderboardEditor, { leaderboardId: leaderboard.id });
                await manager.save(
                    [...new Set(patch.editorIds)].map((userId) =>
                        manager.create(LeaderboardEditor, {
                            leaderboardId: leaderboard.id,
                            userId,
                        }),
                    ),
                );
            }
        });
        return { ok: true, leaderboard: await LeaderboardService.reload(leaderboard.id) };
    }

    /** Members, editors, scores and history cascade in the database. */
    static async delete(leaderboard: Leaderboard): Promise<void> {
        await leaderboard.remove();
    }

    static findForGroup(group: Group, leaderboardId: string): Promise<Leaderboard | null> {
        return Leaderboard.findOne({
            where: { id: leaderboardId, groupId: group.id },
            relations: RELATIONS,
        });
    }

    static async listForGroup(group: Group, viewer: GroupMember): Promise<LeaderboardListingDto[]> {
        const boards = await Leaderboard.find({
            where: { groupId: group.id },
            relations: RELATIONS,
            order: { createdAt: 'ASC' },
        });
        return boards.map((board) =>
            LeaderboardPresenter.listing(board, LeaderboardService.permissionsFor(board, viewer)),
        );
    }

    static detail(leaderboard: Leaderboard, viewer: GroupMember): LeaderboardDetailDto {
        return LeaderboardPresenter.detail(
            leaderboard,
            LeaderboardService.permissionsFor(leaderboard, viewer),
        );
    }

    static permissionsFor(leaderboard: Leaderboard, viewer: GroupMember): LeaderboardPermissions {
        return {
            canManage: LeaderboardService.canManage(leaderboard, viewer),
            canEditScores: LeaderboardService.canEditScores(leaderboard, viewer),
        };
    }

    /** Settings and deletion: the creator, or a group admin. */
    static canManage(leaderboard: Leaderboard, membership: GroupMember): boolean {
        return leaderboard.isCreatedBy(membership.userId) || membership.hasRole(GroupRole.ADMIN);
    }

    /** Entering scores: by edit mode, and always a group admin. Needs `editors` loaded. */
    static canEditScores(leaderboard: Leaderboard, membership: GroupMember): boolean {
        if (membership.hasRole(GroupRole.ADMIN)) return true;
        switch (leaderboard.editMode) {
            case EditMode.EVERYONE:
                return true;
            case EditMode.CREATOR:
                return leaderboard.isCreatedBy(membership.userId);
            case EditMode.SELECTED:
                return leaderboard.editors.some((editor) => editor.userId === membership.userId);
        }
    }

    /**
     * Any group member puts somebody on a board (docs/05). A removed member
     * comes back with their history; a new one starts clean. Nobody without
     * a finished profile can be on a ranking, since there is nothing to show.
     */
    static async addMember(
        group: Group,
        leaderboard: Leaderboard,
        userId: string,
        addedBy: User,
    ): Promise<AddMemberResult> {
        const membership = await GroupMember.findOne({
            where: { groupId: group.id, userId },
            relations: { user: true },
        });
        if (membership === null) {
            return { ok: false, problem: 'NOT_A_GROUP_MEMBER' };
        }
        const summary = membership.user.toSummary();
        if (summary === null) {
            return { ok: false, problem: 'NO_PROFILE' };
        }
        const existing = await LeaderboardMember.findOne({
            where: { leaderboardId: leaderboard.id, userId },
            relations: { user: true },
        });
        if (existing !== null) {
            if (!existing.isActive()) {
                existing.removedAt = null;
                await existing.save();
            }
            return { ok: true, member: existing };
        }
        const member = await LeaderboardMember.create({
            leaderboardId: leaderboard.id,
            userId,
            displayNameSnapshot: summary.displayName,
            avatarKeySnapshot: summary.avatarKey,
            addedById: addedBy.id === userId ? null : addedBy.id,
        }).save();
        return {
            ok: true,
            member: await LeaderboardMember.findOneOrFail({
                where: { id: member.id },
                relations: { user: true },
            }),
        };
    }

    /** Removing: whoever may edit scores, plus admins (docs/05: editors + owner/admin). */
    static canRemoveMember(leaderboard: Leaderboard, membership: GroupMember): boolean {
        return LeaderboardService.canEditScores(leaderboard, membership);
    }

    /**
     * Off the ranking, history kept: the row stays with `removedAt`, the
     * three score rows go, and the history records a clearing by whoever
     * did it. All in one transaction, so a ranking never shows a removed
     * member or hides a live one.
     */
    static async removeMember(
        leaderboard: Leaderboard,
        member: LeaderboardMember,
        actor: User,
    ): Promise<void> {
        const now = DateTime.now().setZone(TIME_ZONE);
        await AppDataSource.transaction(async (manager) => {
            const total = await manager.findOneBy(LeaderboardScoreTotal, {
                leaderboardId: leaderboard.id,
                memberId: member.id,
            });
            await manager.delete(LeaderboardScoreMonthly, { memberId: member.id });
            await manager.delete(LeaderboardScoreYearly, { memberId: member.id });
            await manager.delete(LeaderboardScoreTotal, { memberId: member.id });
            if (total !== null) {
                await manager.save(
                    manager.create(LeaderboardScoreHistory, {
                        leaderboardId: leaderboard.id,
                        memberId: member.id,
                        changedById: actor.id,
                        changedByNameSnapshot: actor.displayName ?? actor.handle ?? '',
                        oldScore: total.score,
                        newScore: null,
                        year: now.year,
                        month: now.month,
                    }),
                );
            }
            member.removedAt = now.toUTC().toJSDate();
            await manager.save(member);
        });
    }

    static findMember(
        leaderboard: Leaderboard,
        memberId: string,
    ): Promise<LeaderboardMember | null> {
        return LeaderboardMember.findOne({
            where: { id: memberId, leaderboardId: leaderboard.id },
            relations: { user: true },
        });
    }

    private static showsSomething(flags: {
        showMonthly: boolean;
        showYearly: boolean;
        showAllTime: boolean;
    }): boolean {
        return flags.showMonthly || flags.showYearly || flags.showAllTime;
    }

    private static async allMembers(group: Group, userIds: string[]): Promise<boolean> {
        const unique = [...new Set(userIds)];
        if (unique.length === 0) return true;
        const found = await GroupMember.countBy({ groupId: group.id, userId: In(unique) });
        return found === unique.length;
    }

    private static reload(leaderboardId: string): Promise<Leaderboard> {
        return Leaderboard.findOneOrFail({ where: { id: leaderboardId }, relations: RELATIONS });
    }
}

/** A PATCH body carries absent fields as undefined; those must not overwrite anything. */
function stripUndefined<T extends object>(value: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as Partial<T>;
}
