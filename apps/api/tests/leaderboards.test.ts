import { describe, expect, it } from 'vitest';
import { EditMode, GroupRole, ScoreType, SortOrder } from '@bzim/types';

import Leaderboard from '../src/app/domain/models/Leaderboard.entity';
import LeaderboardEditor from '../src/app/domain/models/LeaderboardEditor.entity';
import LeaderboardMember from '../src/app/domain/models/LeaderboardMember.entity';
import LeaderboardScoreHistory from '../src/app/domain/models/LeaderboardScoreHistory.entity';
import LeaderboardScoreTotal from '../src/app/domain/models/LeaderboardScoreTotal.entity';
import { LeaderboardService } from '../src/app/domain/services/LeaderboardService';
import {
    seedGroup,
    seedLeaderboard,
    seedLeaderboardMember,
    seedMember,
    seedUser,
} from './support/factories';

async function setup() {
    const owner = await seedUser();
    const group = await seedGroup(owner);
    const creator = await seedUser({ displayName: 'Creator' });
    const creatorMembership = await seedMember(group, creator);
    const member = await seedUser({ displayName: 'Member' });
    const membership = await seedMember(group, member);
    const admin = await seedUser();
    const adminMembership = await seedMember(group, admin, GroupRole.ADMIN);
    return { owner, group, creator, creatorMembership, member, membership, admin, adminMembership };
}

const INPUT = {
    name: 'Klaverjassen',
    scoreType: ScoreType.NUMBER,
    sortOrder: SortOrder.DESC,
    editMode: EditMode.SELECTED,
    showMonthly: true,
    showYearly: false,
    showAllTime: true,
};

describe('LeaderboardService.create and update', () => {
    it('creates with editors, refuses a board without periods or with outsiders as editors', async () => {
        const { group, creator, member, creatorMembership } = await setup();
        const outsider = await seedUser();

        const noPeriod = await LeaderboardService.create(group, creator, {
            ...INPUT,
            showMonthly: false,
            showAllTime: false,
        });
        expect(noPeriod).toEqual({ ok: false, problem: 'NO_PERIOD' });

        const badEditor = await LeaderboardService.create(group, creator, {
            ...INPUT,
            editorIds: [outsider.id],
        });
        expect(badEditor).toEqual({ ok: false, problem: 'EDITOR_NOT_MEMBER' });

        const result = await LeaderboardService.create(group, creator, {
            ...INPUT,
            editorIds: [member.id, member.id],
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const dto = await LeaderboardService.detail(result.leaderboard, creatorMembership);
        expect(dto.name).toBe('Klaverjassen');
        expect(dto.creator?.id).toBe(creator.id);
        expect(dto.editors.map((u) => u.id)).toEqual([member.id]);
        expect(dto.memberCount).toBe(0);
        expect(await LeaderboardEditor.count()).toBe(1);
        expect(await Leaderboard.count()).toBe(1);
    });

    it('replaces editors on update and judges the merged period flags', async () => {
        const { group, creator, member, admin } = await setup();
        const board = await seedLeaderboard(group, creator, {
            showYearly: false,
            showAllTime: false,
        });

        const off = await LeaderboardService.update(group, board, { showMonthly: false });
        expect(off).toEqual({ ok: false, problem: 'NO_PERIOD' });

        const ok = await LeaderboardService.update(group, board, {
            name: 'Renamed',
            editMode: EditMode.SELECTED,
            editorIds: [member.id, admin.id],
        });
        expect(ok.ok).toBe(true);
        if (!ok.ok) return;
        expect(ok.leaderboard.name).toBe('Renamed');
        expect(ok.leaderboard.editors.map((e) => e.userId).sort()).toEqual(
            [member.id, admin.id].sort(),
        );

        const again = await LeaderboardService.update(group, ok.leaderboard, {
            editorIds: [member.id],
        });
        expect(again.ok && again.leaderboard.editors.map((e) => e.userId)).toEqual([member.id]);
    });
});

describe('permissions', () => {
    it('follows docs/05 for managing, editing scores and removing members', async () => {
        const { group, creator, creatorMembership, member, membership, adminMembership } =
            await setup();
        const everyone = await seedLeaderboard(group, creator, { editMode: EditMode.EVERYONE });
        const creatorOnly = await seedLeaderboard(group, creator, { editMode: EditMode.CREATOR });
        const selected = await seedLeaderboard(group, creator, { editMode: EditMode.SELECTED });
        await LeaderboardEditor.create({ leaderboardId: selected.id, userId: member.id }).save();
        const load = (id: string) => LeaderboardService.findForGroup(group, id);
        const [e, c, s] = await Promise.all([
            load(everyone.id),
            load(creatorOnly.id),
            load(selected.id),
        ]);
        if (e === null || c === null || s === null) throw new Error('boards missing');

        expect(e.isManagedBy(creatorMembership)).toBe(true);
        expect(e.isManagedBy(adminMembership)).toBe(true);
        expect(e.isManagedBy(membership)).toBe(false);

        expect(e.isEditableBy(membership)).toBe(true);
        expect(c.isEditableBy(membership)).toBe(false);
        expect(c.isEditableBy(creatorMembership)).toBe(true);
        expect(c.isEditableBy(adminMembership)).toBe(true);
        expect(s.isEditableBy(membership)).toBe(true);
        expect(s.isEditableBy(creatorMembership)).toBe(false);
        expect(s.isEditableBy(adminMembership)).toBe(true);
    });
});

describe('members', () => {
    it('adds group members only, once, and brings a removed one back with their history', async () => {
        const { group, creator, member } = await setup();
        const board = await seedLeaderboard(group, creator);
        const outsider = await seedUser();

        expect(await LeaderboardService.addMember(group, board, outsider.id, creator)).toEqual({
            ok: false,
            problem: 'NOT_A_GROUP_MEMBER',
        });
        const first = await LeaderboardService.addMember(group, board, member.id, creator);
        const second = await LeaderboardService.addMember(group, board, member.id, creator);
        expect(first.ok && second.ok && first.member.id === second.member.id).toBe(true);
        expect(await LeaderboardMember.count()).toBe(1);
        if (!first.ok) return;
        expect(first.member.addedById).toBe(creator.id);
        expect(first.member.toDto()).toMatchObject({ displayName: 'Member', removedAt: null });

        // A score on the all-time table, then removal: rows gone, history written, row kept.
        await LeaderboardScoreTotal.create({
            leaderboardId: board.id,
            memberId: first.member.id,
            score: 42,
            updatedById: creator.id,
        }).save();
        await LeaderboardService.removeMember(board, first.member, creator);
        const removed = await LeaderboardMember.findOneOrFail({
            where: { id: first.member.id },
            relations: { user: true },
        });
        expect(removed.isActive()).toBe(false);
        expect(await LeaderboardScoreTotal.count()).toBe(0);
        const history = await LeaderboardScoreHistory.findOneByOrFail({
            memberId: first.member.id,
        });
        expect(history).toMatchObject({ oldScore: 42, newScore: null, changedById: creator.id });

        const back = await LeaderboardService.addMember(group, board, member.id, creator);
        expect(back.ok && back.member.isActive()).toBe(true);
        expect(await LeaderboardScoreHistory.count()).toBe(1);
    });

    it('keeps a member row with snapshots when the person leaves, and deletes everything with the board', async () => {
        const { group, creator, member } = await setup();
        const board = await seedLeaderboard(group, creator);
        const row = await seedLeaderboardMember(board, member);
        await member.remove();
        const orphan = await LeaderboardMember.findOneOrFail({
            where: { id: row.id },
            relations: { user: true },
        });
        expect(orphan.userId).toBeNull();
        expect(orphan.toDto()).toMatchObject({ user: null, displayName: 'Member' });

        await LeaderboardService.delete(board);
        expect(await LeaderboardMember.count()).toBe(0);
    });
});
