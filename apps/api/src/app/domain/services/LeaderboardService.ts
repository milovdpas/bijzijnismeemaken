import { DateTime } from 'luxon';
import { In } from 'typeorm';
import type { FindOptionsRelations } from 'typeorm';
import {
    AVATAR_KEYS,
    EditMode,
    LEADERBOARD,
    LeaderboardPeriod,
    ScoreType,
    TIME_ZONE,
    WidgetType,
} from '@bzim/types';
import type {
    AvatarKey,
    CreateLeaderboardInput,
    LeaderboardDetailDto,
    LeaderboardInput,
    LeaderboardListingDto,
} from '@bzim/types';

import { AppDataSource } from '../../../database/typeorm-db';
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
import { ScoreQueryService } from './ScoreQueryService';
import { WidgetService } from './WidgetService';

export type LeaderboardProblem =
    /** None of the three periods switched on; a board must show something. */
    | 'NO_PERIOD'
    /** An editor who is not in the group. */
    | 'EDITOR_NOT_MEMBER'
    /** Somebody to put on a private board who is not in the group, or has no profile yet. */
    | 'MEMBER_NOT_IN_GROUP'
    /** More people for a private board than `LEADERBOARD.PRIVATE_MEMBERS_MAX`. */
    | 'TOO_MANY_MEMBERS';

export type LeaderboardResult =
    { ok: true; leaderboard: Leaderboard } | { ok: false; problem: LeaderboardProblem };

export type AddMemberResult =
    | { ok: true; member: LeaderboardMember }
    | { ok: false; problem: 'NOT_A_GROUP_MEMBER' | 'NO_PROFILE' | 'FULL' };

export type AddGuestResult =
    { ok: true; member: LeaderboardMember } | { ok: false; problem: 'FULL' };

export type RemoveMemberResult = { ok: true } | { ok: false; problem: 'LAST_MEMBER' };

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
    /**
     * A private board starts with its people on it: the creator always,
     * since nobody else could see it otherwise, the chosen others, and
     * guests by name (a game from the tools hands over everybody who played).
     */
    static async create(
        group: Group,
        creator: User,
        input: CreateLeaderboardInput,
    ): Promise<LeaderboardResult> {
        if (!LeaderboardService.showsSomething(input)) {
            return { ok: false, problem: 'NO_PERIOD' };
        }
        const isPrivate = input.isPrivate ?? false;
        // On a private board everybody on it enters scores, so it has no editors.
        const editorIds =
            !isPrivate && input.editMode === EditMode.SELECTED ? (input.editorIds ?? []) : [];
        if (!(await LeaderboardService.allMembers(group, editorIds))) {
            return { ok: false, problem: 'EDITOR_NOT_MEMBER' };
        }
        const memberIds = isPrivate ? [...new Set([creator.id, ...(input.memberIds ?? [])])] : [];
        const guestNames = isPrivate ? (input.guestNames ?? []) : [];
        if (memberIds.length + guestNames.length > LEADERBOARD.PRIVATE_MEMBERS_MAX) {
            return { ok: false, problem: 'TOO_MANY_MEMBERS' };
        }
        const people =
            memberIds.length === 0
                ? []
                : (
                      await GroupMember.find({
                          where: { groupId: group.id, userId: In(memberIds) },
                          relations: { user: true },
                      })
                  ).flatMap((membership) => {
                      const summary = membership.user.toSummary();
                      return summary === null ? [] : [summary];
                  });
        if (people.length !== memberIds.length) {
            return { ok: false, problem: 'MEMBER_NOT_IN_GROUP' };
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
                    editMode: isPrivate ? EditMode.EVERYONE : input.editMode,
                    showMonthly: input.showMonthly,
                    showYearly: input.showYearly,
                    showAllTime: input.showAllTime,
                    showSteppers: LeaderboardService.steppersFor(input),
                    cardPeriod: LeaderboardService.cardPeriodFor(input),
                    isPrivate,
                }),
            );
            await manager.save(
                [...new Set(editorIds)].map((userId) =>
                    manager.create(LeaderboardEditor, { leaderboardId: leaderboard.id, userId }),
                ),
            );
            await manager.save(
                people.map((person) =>
                    manager.create(LeaderboardMember, {
                        leaderboardId: leaderboard.id,
                        userId: person.id,
                        displayNameSnapshot: person.displayName,
                        avatarKeySnapshot: person.avatarKey,
                        addedById: person.id === creator.id ? null : creator.id,
                    }),
                ),
            );
            await manager.save(
                guestNames.map((name) =>
                    manager.create(LeaderboardMember, {
                        leaderboardId: leaderboard.id,
                        userId: null,
                        displayNameSnapshot: name,
                        avatarKeySnapshot:
                            AVATAR_KEYS[Math.floor(Math.random() * AVATAR_KEYS.length)],
                        addedById: creator.id,
                    }),
                ),
            );
            return leaderboard;
        });
        return { ok: true, leaderboard: await LeaderboardService.reload(created.id) };
    }

    /** Steppers are a points thing: a time board never shows them, whatever was asked. */
    private static steppersFor(settings: {
        scoreType: ScoreType;
        showSteppers?: boolean;
    }): boolean {
        return settings.scoreType === ScoreType.NUMBER && (settings.showSteppers ?? false);
    }

    /** The card shows one of the periods the board keeps: the chosen one, else the first shown. */
    private static cardPeriodFor(settings: {
        showMonthly: boolean;
        showYearly: boolean;
        showAllTime: boolean;
        cardPeriod?: LeaderboardPeriod;
    }): LeaderboardPeriod {
        const shown = [
            ...(settings.showMonthly ? [LeaderboardPeriod.MONTHLY] : []),
            ...(settings.showYearly ? [LeaderboardPeriod.YEARLY] : []),
            ...(settings.showAllTime ? [LeaderboardPeriod.TOTAL] : []),
        ];
        return settings.cardPeriod !== undefined && shown.includes(settings.cardPeriod)
            ? settings.cardPeriod
            : (shown[0] ?? LeaderboardPeriod.TOTAL);
    }

    /**
     * Settings. The editor list is replaced wholesale when given. A private
     * board keeps everybody on it as its editors, so its edit mode and
     * editors are left as they are.
     */
    static async update(
        group: Group,
        leaderboard: Leaderboard,
        changes: Partial<LeaderboardInput>,
    ): Promise<LeaderboardResult> {
        const patch = leaderboard.isPrivate
            ? { ...changes, editMode: undefined, editorIds: undefined }
            : changes;
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
        leaderboard.showSteppers = LeaderboardService.steppersFor(leaderboard);
        leaderboard.cardPeriod = LeaderboardService.cardPeriodFor(leaderboard);
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

    /** Members, editors, scores and history cascade in the database; a dashboard widget showing it goes too. */
    static async delete(leaderboard: Leaderboard): Promise<void> {
        await WidgetService.removeForTarget(WidgetType.LEADERBOARD, leaderboard.id);
        await leaderboard.remove();
    }

    static findForGroup(group: Group, leaderboardId: string): Promise<Leaderboard | null> {
        return Leaderboard.findOne({
            where: { id: leaderboardId, groupId: group.id },
            relations: RELATIONS,
        });
    }

    /** The group's boards, and of the private ones only those the viewer is on. */
    static async listForGroup(group: Group, viewer: GroupMember): Promise<LeaderboardListingDto[]> {
        const boards = (
            await Leaderboard.find({
                where: { groupId: group.id },
                relations: RELATIONS,
                order: { createdAt: 'ASC' },
            })
        ).filter((board) => board.isVisibleTo(viewer));
        return Promise.all(
            boards.map(async (board) =>
                LeaderboardPresenter.listing(
                    board,
                    LeaderboardService.permissionsFor(board, viewer),
                    await ScoreQueryService.top(board, LEADERBOARD.CARD_TOP),
                ),
            ),
        );
    }

    static async detail(
        leaderboard: Leaderboard,
        viewer: GroupMember,
    ): Promise<LeaderboardDetailDto> {
        return LeaderboardPresenter.detail(
            leaderboard,
            LeaderboardService.permissionsFor(leaderboard, viewer),
            await ScoreQueryService.top(leaderboard, LEADERBOARD.CARD_TOP),
        );
    }

    static permissionsFor(leaderboard: Leaderboard, viewer: GroupMember): LeaderboardPermissions {
        return {
            canManage: leaderboard.isManagedBy(viewer),
            canEditScores: leaderboard.isEditableBy(viewer),
        };
    }

    /**
     * Any group member puts somebody on a board (docs/05); on a private board,
     * anybody on it, up to `LEADERBOARD.PRIVATE_MEMBERS_MAX`. A removed member
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
        if (existing?.isActive() === true) {
            return { ok: true, member: existing };
        }
        if (leaderboard.isFull()) {
            return { ok: false, problem: 'FULL' };
        }
        if (existing !== null) {
            existing.removedAt = null;
            await existing.save();
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

    /**
     * A player without an account: a name and a face on the board, nothing
     * else. `userId` stays null, so leaving and decoupling never touch it.
     * A guest takes a place on a private board like anybody else.
     */
    static async addGuest(
        leaderboard: Leaderboard,
        name: string,
        avatarKey: AvatarKey | undefined,
        addedBy: User,
    ): Promise<AddGuestResult> {
        if (leaderboard.isFull()) {
            return { ok: false, problem: 'FULL' };
        }
        const member = await LeaderboardMember.create({
            leaderboardId: leaderboard.id,
            userId: null,
            displayNameSnapshot: name,
            avatarKeySnapshot:
                avatarKey ?? AVATAR_KEYS[Math.floor(Math.random() * AVATAR_KEYS.length)],
            addedById: addedBy.id,
        }).save();
        return {
            ok: true,
            member: await LeaderboardMember.findOneOrFail({
                where: { id: member.id },
                relations: { user: true },
            }),
        };
    }

    /**
     * Off the ranking, history kept: the row stays with `removedAt`, the
     * three score rows go, and the history records a clearing by whoever
     * did it. All in one transaction, so a ranking never shows a removed
     * member or hides a live one. A private board keeps at least one person
     * with an account, who can still see it; deleting it is the way out.
     */
    static async removeMember(
        leaderboard: Leaderboard,
        member: LeaderboardMember,
        actor: User,
    ): Promise<RemoveMemberResult> {
        if (
            leaderboard.isPrivate &&
            member.userId !== null &&
            !leaderboard.members.some(
                (other) => other.id !== member.id && other.userId !== null && other.isActive(),
            )
        ) {
            return { ok: false, problem: 'LAST_MEMBER' };
        }
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
        return { ok: true };
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
