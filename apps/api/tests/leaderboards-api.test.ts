import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, EditMode, GroupRole, LEADERBOARD, ScoreType, SortOrder } from '@bzim/types';
import type {
    LeaderboardDetailDto,
    LeaderboardListingDto,
    LeaderboardMemberDto,
    Paginated,
    PeriodsResponse,
    ScoreHistoryDto,
    ScoresResponse,
} from '@bzim/types';

import LeaderboardScoreHistory from '../src/app/models/LeaderboardScoreHistory.entity';
import LeaderboardScoreMonthly from '../src/app/models/LeaderboardScoreMonthly.entity';
import LeaderboardScoreTotal from '../src/app/models/LeaderboardScoreTotal.entity';
import LeaderboardScoreYearly from '../src/app/models/LeaderboardScoreYearly.entity';
import { ScoreService } from '../src/app/services/ScoreService';
import { sessionFor } from './support/auth';
import { asUser, data, error } from './support/client';
import {
    seedGroup,
    seedLeaderboard,
    seedLeaderboardMember,
    seedMember,
    seedUser,
} from './support/factories';

async function setup() {
    const owner = await seedUser({ displayName: 'Milo' });
    const group = await seedGroup(owner);
    const anna = await seedUser({ displayName: 'Anna' });
    await seedMember(group, anna);
    const bob = await seedUser({ displayName: 'Bob' });
    await seedMember(group, bob);
    const admin = await seedUser({ displayName: 'Cas' });
    await seedMember(group, admin, GroupRole.ADMIN);
    const asOwner = asUser((await sessionFor(owner)).accessToken);
    const asAnna = asUser((await sessionFor(anna)).accessToken);
    const asBob = asUser((await sessionFor(bob)).accessToken);
    return { owner, group, anna, bob, admin, asOwner, asAnna, asBob };
}

const INPUT = {
    name: 'Klaverjassen',
    scoreType: ScoreType.NUMBER,
    sortOrder: SortOrder.DESC,
    editMode: EditMode.CREATOR,
    showMonthly: true,
    showYearly: true,
    showAllTime: true,
    showSteppers: true,
};

describe('leaderboard CRUD', () => {
    it('creates, lists with permissions, updates by creator or admin, deletes', async () => {
        const { group, anna, asAnna, asBob, asOwner } = await setup();

        const created = await asAnna.post(API_ENDPOINTS.LEADERBOARDS.CREATE(group.id), INPUT);
        expect(created.status).toBe(201);
        const board = data<LeaderboardDetailDto>(created);
        expect(board.creator?.id).toBe(anna.id);
        expect(board).toMatchObject({
            canManage: true,
            canEditScores: true,
            memberCount: 0,
            showSteppers: true,
        });

        const forBob = data<LeaderboardListingDto[]>(
            await asBob.get(API_ENDPOINTS.LEADERBOARDS.LIST(group.id)),
        );
        expect(forBob).toHaveLength(1);
        expect(forBob[0]).toMatchObject({ canManage: false, canEditScores: false });

        const url = API_ENDPOINTS.LEADERBOARDS.DETAIL(group.id, board.id);
        expect((await asBob.patch(url, { name: 'Nope' })).status).toBe(403);
        const bad = await asAnna.patch(url, {
            showMonthly: false,
            showYearly: false,
            showAllTime: false,
        });
        expect(bad.status).toBe(422);
        expect(error(bad).details).toEqual({ problem: 'NO_PERIOD' });
        expect(data<LeaderboardDetailDto>(await asOwner.patch(url, { name: 'Renamed' })).name).toBe(
            'Renamed',
        );
        // Steppers are for points: switching to a time board turns them off.
        const timed = data<LeaderboardDetailDto>(
            await asAnna.patch(url, { scoreType: ScoreType.TIME }),
        );
        expect(timed.showSteppers).toBe(false);

        expect((await asBob.delete(url)).status).toBe(403);
        expect((await asAnna.delete(url)).status).toBe(204);
        expect((await asAnna.get(url)).status).toBe(404);
    });
});

describe('members and scores', () => {
    it('adds members, writes scores through to three tables with history, and ranks them', async () => {
        const { group, owner, anna, bob, asOwner, asAnna, asBob } = await setup();
        const board = await seedLeaderboard(group, owner, { editMode: EditMode.CREATOR });
        const membersUrl = API_ENDPOINTS.LEADERBOARDS.MEMBERS(group.id, board.id);

        const addedAnna = data<LeaderboardMemberDto>(
            await asBob.post(membersUrl, { userId: anna.id }),
        );
        const addedBob = data<LeaderboardMemberDto>(
            await asAnna.post(membersUrl, { userId: bob.id }),
        );
        expect((await asAnna.post(membersUrl, { userId: (await seedUser()).id })).status).toBe(404);

        const scoreUrl = (memberId: string) =>
            API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE(group.id, board.id, memberId);
        // Creator-only edit mode: Anna may not, the owner (creator here) may.
        expect((await asAnna.put(scoreUrl(addedAnna.id), { score: 10 })).status).toBe(403);
        expect((await asOwner.put(scoreUrl(addedAnna.id), { score: 10 })).status).toBe(204);
        expect((await asOwner.put(scoreUrl(addedBob.id), { score: 10 })).status).toBe(204);
        expect((await asOwner.put(scoreUrl(addedBob.id), { score: 10 })).status).toBe(204);
        expect((await asOwner.put(scoreUrl(addedBob.id), { score: -1 })).status).toBe(422);

        const { year, month } = ScoreService.currentPeriod();
        expect(
            await LeaderboardScoreMonthly.countBy({ leaderboardId: board.id, year, month }),
        ).toBe(2);
        expect(await LeaderboardScoreYearly.countBy({ leaderboardId: board.id, year })).toBe(2);
        expect(await LeaderboardScoreTotal.countBy({ leaderboardId: board.id })).toBe(2);
        // The repeated 10 was a no-op: two history rows, not three.
        expect(await LeaderboardScoreHistory.countBy({ leaderboardId: board.id })).toBe(2);

        // Same score: Anna was first, so she ranks first. The list and "me" agree.
        const scoresUrl = API_ENDPOINTS.LEADERBOARDS.SCORES(group.id, board.id);
        const total = data<ScoresResponse>(await asBob.get(`${scoresUrl}?period=total`));
        expect(total.items.map((e) => [e.rank, e.member.displayName, e.score])).toEqual([
            [1, 'Anna', 10],
            [2, 'Bob', 10],
        ]);
        expect(total.me).toEqual({ rank: '2', score: 10 });
        expect(total.total).toBe(2);
        expect(data<ScoresResponse>(await asOwner.get(`${scoresUrl}?period=total`)).me).toBeNull();

        // Bob overtakes; lowest-first boards invert.
        expect((await asOwner.put(scoreUrl(addedBob.id), { score: 12.3456 })).status).toBe(204);
        const monthly = data<ScoresResponse>(
            await asAnna.get(
                `${scoresUrl}?period=monthly&year=${String(year)}&month=${String(month)}`,
            ),
        );
        expect(monthly.items.map((e) => [e.rank, e.member.displayName, e.score])).toEqual([
            [1, 'Bob', 12.346],
            [2, 'Anna', 10],
        ]);
        expect(monthly).toMatchObject({
            period: 'monthly',
            year,
            month,
            me: { rank: '2', score: 10 },
        });
        board.sortOrder = SortOrder.ASC;
        await board.save();
        const lowestFirst = data<ScoresResponse>(await asAnna.get(`${scoresUrl}?period=yearly`));
        expect(lowestFirst.items.map((e) => e.member.displayName)).toEqual(['Anna', 'Bob']);
        expect(lowestFirst.me).toEqual({ rank: '1', score: 10 });

        // Periods, history, clearing.
        const periods = data<PeriodsResponse>(
            await asBob.get(API_ENDPOINTS.LEADERBOARDS.PERIODS(group.id, board.id)),
        );
        expect(periods).toEqual({ months: [{ year, month }], years: [year] });

        expect((await asOwner.delete(scoreUrl(addedAnna.id))).status).toBe(204);
        expect((await asOwner.delete(scoreUrl(addedAnna.id))).status).toBe(204);
        expect(await LeaderboardScoreTotal.countBy({ leaderboardId: board.id })).toBe(1);
        const history = data<Paginated<ScoreHistoryDto>>(
            await asBob.get(
                `${API_ENDPOINTS.LEADERBOARDS.HISTORY(group.id, board.id)}?pageSize=10`,
            ),
        );
        expect(history.total).toBe(4);
        expect(history.items[0]).toMatchObject({
            member: { displayName: 'Anna' },
            changedByName: 'Milo',
            oldScore: 10,
            newScore: null,
            year,
            month,
        });

        // Removing a member: editors and admins only; a removed member is no longer scorable.
        expect(
            (
                await asAnna.delete(
                    API_ENDPOINTS.LEADERBOARDS.MEMBER(group.id, board.id, addedBob.id),
                )
            ).status,
        ).toBe(403);
        expect(
            (
                await asOwner.delete(
                    API_ENDPOINTS.LEADERBOARDS.MEMBER(group.id, board.id, addedBob.id),
                )
            ).status,
        ).toBe(204);
        expect((await asOwner.put(scoreUrl(addedBob.id), { score: 1 })).status).toBe(404);
        expect(data<ScoresResponse>(await asBob.get(`${scoresUrl}?period=total`)).items).toEqual(
            [],
        );
    });

    it('caps the ranking at the rank limit and pages consistently', async () => {
        const { group, owner, asOwner } = await setup();
        const board = await seedLeaderboard(group, owner);
        const me = await seedLeaderboardMember(board, owner);
        await ScoreService.set(board, me, owner, 1);
        const scoresUrl = API_ENDPOINTS.LEADERBOARDS.SCORES(group.id, board.id);

        const page = data<ScoresResponse>(
            await asOwner.get(`${scoresUrl}?period=total&pageSize=100`),
        );
        expect(page.items).toHaveLength(1);
        expect(page.total).toBe(1);
        expect(page.hasMore).toBe(false);

        const beyond = data<ScoresResponse>(
            await asOwner.get(
                `${scoresUrl}?period=total&page=${String(LEADERBOARD.RANK_LIMIT / 100 + 1)}&pageSize=100`,
            ),
        );
        expect(beyond.items).toEqual([]);
        expect(beyond.me).toEqual({ rank: '1', score: 1 });
        expect((await asOwner.get(`${scoresUrl}?period=weekly`)).status).toBe(422);
    });
});
