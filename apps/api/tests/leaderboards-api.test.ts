import { describe, expect, it } from 'vitest';
import {
    API_ENDPOINTS,
    EditMode,
    GroupRole,
    LEADERBOARD,
    LeaderboardPeriod,
    ScoreType,
    SortOrder,
    WidgetType,
} from '@bzim/types';
import type {
    LeaderboardDetailDto,
    LeaderboardListingDto,
    LeaderboardMemberDto,
    Paginated,
    PeriodsResponse,
    ScoreHistoryDto,
    ScoresResponse,
} from '@bzim/types';

import Leaderboard from '../src/app/domain/models/Leaderboard.entity';
import LeaderboardScoreHistory from '../src/app/domain/models/LeaderboardScoreHistory.entity';
import LeaderboardScoreMonthly from '../src/app/domain/models/LeaderboardScoreMonthly.entity';
import LeaderboardScoreTotal from '../src/app/domain/models/LeaderboardScoreTotal.entity';
import LeaderboardScoreYearly from '../src/app/domain/models/LeaderboardScoreYearly.entity';
import { ScoreService } from '../src/app/domain/services/ScoreService';
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

describe('guests and the card ranking', () => {
    it('adds a guest by name, shows the top of the card period in the list, and keeps the card period shown', async () => {
        const { group, owner, anna, asOwner, asAnna } = await setup();
        const board = await seedLeaderboard(group, owner, { showMonthly: false });
        const membersUrl = API_ENDPOINTS.LEADERBOARDS.MEMBERS(group.id, board.id);

        const guest = data<LeaderboardMemberDto>(
            await asAnna.post(membersUrl, { name: ' Opa Jan ', avatarKey: 'cat' }),
        );
        expect(guest).toMatchObject({ user: null, displayName: 'Opa Jan', avatarKey: 'cat' });
        expect((await asAnna.post(membersUrl, { name: 'X' })).status).toBe(422);
        expect((await asAnna.post(membersUrl, { name: 'Both', userId: anna.id })).status).toBe(422);
        expect((await asAnna.post(membersUrl, {})).status).toBe(422);
        const annaOnBoard = data<LeaderboardMemberDto>(
            await asAnna.post(membersUrl, { userId: anna.id }),
        );

        const scoreUrl = (memberId: string) =>
            API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE(group.id, board.id, memberId);
        expect((await asOwner.put(scoreUrl(guest.id), { score: 7 })).status).toBe(204);
        expect((await asOwner.put(scoreUrl(annaOnBoard.id), { score: 9 })).status).toBe(204);

        const listing = data<LeaderboardListingDto[]>(
            await asAnna.get(API_ENDPOINTS.LEADERBOARDS.LIST(group.id)),
        );
        expect(listing[0]?.cardPeriod).toBe('total');
        expect(
            listing[0]?.top.map((entry) => [entry.rank, entry.member.displayName, entry.score]),
        ).toEqual([
            [1, 'Anna', 9],
            [2, 'Opa Jan', 7],
        ]);

        // A hidden period cannot be the card's: the first shown one takes over.
        const url = API_ENDPOINTS.LEADERBOARDS.DETAIL(group.id, board.id);
        expect(
            data<LeaderboardDetailDto>(await asOwner.patch(url, { cardPeriod: 'monthly' }))
                .cardPeriod,
        ).toBe('yearly');
        expect(
            data<LeaderboardDetailDto>(
                await asOwner.patch(url, { showMonthly: true, cardPeriod: 'monthly' }),
            ).cardPeriod,
        ).toBe('monthly');
        expect(
            data<LeaderboardDetailDto>(await asOwner.patch(url, { showMonthly: false })).cardPeriod,
        ).toBe('yearly');
    });
});

describe('private boards', () => {
    it('shows a private board only to the people on it, admins included, and lets each of them run it', async () => {
        const { group, owner, anna, bob, admin, asOwner, asAnna, asBob } = await setup();
        const asAdmin = asUser((await sessionFor(admin)).accessToken);

        const created = await asAnna.post(API_ENDPOINTS.LEADERBOARDS.CREATE(group.id), {
            ...INPUT,
            name: 'Anna tegen Bob',
            // A private board has no editors: everybody on it enters scores.
            editMode: EditMode.SELECTED,
            editorIds: [owner.id],
            isPrivate: true,
            memberIds: [bob.id],
        });
        expect(created.status).toBe(201);
        const board = data<LeaderboardDetailDto>(created);
        expect(board).toMatchObject({
            isPrivate: true,
            editMode: EditMode.EVERYONE,
            editors: [],
            memberCount: 2,
            canManage: true,
            canEditScores: true,
        });
        expect(board.members.map((member) => member.user?.id).sort()).toEqual(
            [anna.id, bob.id].sort(),
        );

        const listFor = async (client: typeof asOwner) =>
            data<LeaderboardListingDto[]>(
                await client.get(API_ENDPOINTS.LEADERBOARDS.LIST(group.id)),
            ).map((listing) => listing.id);
        expect(await listFor(asBob)).toEqual([board.id]);
        expect(await listFor(asOwner)).toEqual([]);
        expect(await listFor(asAdmin)).toEqual([]);

        // To anybody not on it, the board does not exist, admins and owner included.
        const url = API_ENDPOINTS.LEADERBOARDS.DETAIL(group.id, board.id);
        expect((await asOwner.get(url)).status).toBe(404);
        expect((await asAdmin.get(url)).status).toBe(404);
        expect((await asOwner.patch(url, { name: 'Nee' })).status).toBe(404);
        expect((await asAdmin.delete(url)).status).toBe(404);
        expect(
            (await asOwner.get(API_ENDPOINTS.LEADERBOARDS.HISTORY(group.id, board.id))).status,
        ).toBe(404);

        // Bob did not make it, and runs it all the same; the edit mode stays.
        const renamed = data<LeaderboardDetailDto>(
            await asBob.patch(url, { name: 'Bob tegen Anna', editMode: EditMode.CREATOR }),
        );
        expect(renamed).toMatchObject({ name: 'Bob tegen Anna', editMode: EditMode.EVERYONE });
        const annaOnBoard = board.members.find((member) => member.user?.id === anna.id);
        expect(
            (
                await asBob.post(
                    API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE_STEP(
                        group.id,
                        board.id,
                        annaOnBoard?.id ?? '',
                    ),
                    { delta: 1 },
                )
            ).status,
        ).toBe(204);

        // Never on the dashboard, which is the whole group's.
        const widget = await asOwner.post(API_ENDPOINTS.WIDGETS.CREATE(group.id), {
            type: WidgetType.LEADERBOARD,
            config: { leaderboardId: board.id, period: LeaderboardPeriod.TOTAL, limit: 3 },
        });
        expect(widget.status).toBe(422);
        expect(error(widget).details).toEqual({ problem: 'TARGET_NOT_FOUND' });

        expect((await asBob.delete(url)).status).toBe(204);
        expect(await Leaderboard.existsBy({ id: board.id })).toBe(false);
    });

    it('caps a private board, keeps somebody who can see it, and goes with the last of them', async () => {
        const { group, owner, anna, bob, asAnna, asBob } = await setup();
        const create = (memberIds: string[]) =>
            asAnna.post(API_ENDPOINTS.LEADERBOARDS.CREATE(group.id), {
                ...INPUT,
                isPrivate: true,
                memberIds,
            });

        const outsider = await seedUser();
        const notInGroup = await create([bob.id, outsider.id]);
        expect(notInGroup.status).toBe(422);
        expect(error(notInGroup).details).toEqual({ problem: 'MEMBER_NOT_IN_GROUP' });
        const crowd = [];
        for (let index = 0; index < LEADERBOARD.PRIVATE_MEMBERS_MAX; index += 1) {
            const user = await seedUser();
            await seedMember(group, user);
            crowd.push(user.id);
        }
        const tooMany = await create(crowd);
        expect(tooMany.status).toBe(422);
        expect(error(tooMany).details).toEqual({ problem: 'TOO_MANY_MEMBERS' });

        // Guests count towards the cap from the start too.
        const crowded = await asAnna.post(API_ENDPOINTS.LEADERBOARDS.CREATE(group.id), {
            ...INPUT,
            isPrivate: true,
            memberIds: [bob.id],
            guestNames: Array.from(
                { length: LEADERBOARD.PRIVATE_MEMBERS_MAX - 1 },
                (_, index) => `Gast ${String(index)}`,
            ),
        });
        expect(error(crowded).details).toEqual({ problem: 'TOO_MANY_MEMBERS' });

        // Anna, Bob and a guest from a game, then more guests up to the cap.
        const board = data<LeaderboardDetailDto>(
            await asAnna.post(API_ENDPOINTS.LEADERBOARDS.CREATE(group.id), {
                ...INPUT,
                isPrivate: true,
                memberIds: [bob.id],
                guestNames: [' Opa Jan '],
            }),
        );
        expect(board.memberCount).toBe(3);
        expect(board.members.find((member) => member.user === null)?.displayName).toBe('Opa Jan');
        const membersUrl = API_ENDPOINTS.LEADERBOARDS.MEMBERS(group.id, board.id);
        for (let index = 3; index < LEADERBOARD.PRIVATE_MEMBERS_MAX; index += 1) {
            expect((await asBob.post(membersUrl, { name: `Gast ${String(index)}` })).status).toBe(
                201,
            );
        }
        const full = await asBob.post(membersUrl, { name: 'Te veel' });
        expect(full.status).toBe(409);
        expect(error(full).details).toEqual({ problem: 'FULL' });
        expect((await asBob.post(membersUrl, { userId: owner.id })).status).toBe(409);
        // Somebody already on it is no new place.
        expect((await asBob.post(membersUrl, { userId: anna.id })).status).toBe(201);

        // Bob may go; Anna, the last with an account, may not: deleting is the way out.
        const memberUrl = (userId: string) =>
            API_ENDPOINTS.LEADERBOARDS.MEMBER(
                group.id,
                board.id,
                board.members.find((member) => member.user?.id === userId)?.id ?? '',
            );
        expect((await asBob.delete(memberUrl(bob.id))).status).toBe(204);
        expect(
            (await asBob.get(API_ENDPOINTS.LEADERBOARDS.DETAIL(group.id, board.id))).status,
        ).toBe(404);
        const last = await asAnna.delete(memberUrl(anna.id));
        expect(last.status).toBe(409);
        expect(error(last).details).toEqual({ problem: 'LAST_MEMBER' });

        // When Anna leaves the group nobody can see it any more, so it goes; a group board stays.
        const shared = await seedLeaderboard(group, anna);
        expect((await asAnna.post(API_ENDPOINTS.GROUPS.LEAVE(group.id))).status).toBe(204);
        expect(await Leaderboard.existsBy({ id: board.id })).toBe(false);
        expect(await Leaderboard.existsBy({ id: shared.id })).toBe(true);
    });
});

describe('score steps', () => {
    it('steps one up or down in every period at once, never below zero, on points only', async () => {
        const { group, owner, anna, asOwner } = await setup();
        const board = await seedLeaderboard(group, owner, { showSteppers: true });
        const member = await seedLeaderboardMember(board, anna);
        const stepUrl = API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE_STEP(group.id, board.id, member.id);
        const values = async () => {
            const { year, month } = ScoreService.currentPeriod();
            return [
                (await LeaderboardScoreMonthly.findOneBy({ memberId: member.id, year, month }))
                    ?.score ?? null,
                (await LeaderboardScoreYearly.findOneBy({ memberId: member.id, year }))?.score ??
                    null,
                (await LeaderboardScoreTotal.findOneBy({ memberId: member.id }))?.score ?? null,
            ];
        };

        // Nothing to take one off yet: no rows, no history.
        expect((await asOwner.post(stepUrl, { delta: -1 })).status).toBe(204);
        expect(await values()).toEqual([null, null, null]);
        expect(await LeaderboardScoreHistory.countBy({ memberId: member.id })).toBe(0);

        expect(
            (
                await asOwner.put(
                    API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE(group.id, board.id, member.id),
                    { score: 5 },
                )
            ).status,
        ).toBe(204);
        // A new month: this month starts empty while the year and all time keep counting.
        await LeaderboardScoreMonthly.delete({ memberId: member.id });
        expect((await asOwner.post(stepUrl, { delta: 1 })).status).toBe(204);
        expect(await values()).toEqual([1, 6, 6]);
        expect((await asOwner.post(stepUrl, { delta: -1 })).status).toBe(204);
        expect((await asOwner.post(stepUrl, { delta: -1 })).status).toBe(204);
        expect(await values()).toEqual([0, 4, 4]);
        const latest = await LeaderboardScoreHistory.find({
            where: { memberId: member.id },
            order: { createdAt: 'DESC' },
        });
        expect(latest).toHaveLength(4);
        expect(latest[0]).toMatchObject({ oldScore: 5, newScore: 4 });

        expect((await asOwner.post(stepUrl, { delta: 2 })).status).toBe(422);
        const timed = await seedLeaderboard(group, owner, { scoreType: ScoreType.TIME });
        const runner = await seedLeaderboardMember(timed, anna);
        const refused = await asOwner.post(
            API_ENDPOINTS.LEADERBOARDS.MEMBER_SCORE_STEP(group.id, timed.id, runner.id),
            { delta: 1 },
        );
        expect(refused.status).toBe(409);
        expect(error(refused).details).toEqual({ problem: 'TIME_BOARD' });
    });
});
