import { describe, expect, it } from 'vitest';
import {
    API_ENDPOINTS,
    GroupRole,
    MatchStage,
    MatchStatus,
    ParticipantMode,
    TournamentFormat,
    TournamentStatus,
} from '@bzim/types';
import type { TournamentDetailDto, TournamentListingDto, TournamentMatchDto } from '@bzim/types';

import { sessionFor } from './support/auth';
import { asUser, data, error } from './support/client';
import { seedGroup, seedMember, seedUser } from './support/factories';

const T = API_ENDPOINTS.TOURNAMENTS;

/** Anna organises; Bob plays and is a plain member; Cas is an admin. */
async function world() {
    const owner = await seedUser({ displayName: 'Milo' });
    const group = await seedGroup(owner);
    const anna = await seedUser({ displayName: 'Anna' });
    const bob = await seedUser({ displayName: 'Bob' });
    const cas = await seedUser({ displayName: 'Cas' });
    await seedMember(group, anna);
    await seedMember(group, bob);
    await seedMember(group, cas, GroupRole.ADMIN);
    const as = async (user: Awaited<ReturnType<typeof seedUser>>) =>
        asUser((await sessionFor(user)).accessToken);
    return { group, anna, bob, asAnna: await as(anna), asBob: await as(bob), asCas: await as(cas) };
}

type World = Awaited<ReturnType<typeof world>>;
type Person = { userId: string } | string;

/** A tournament by Anna with these entries in this order (so these seeds), started. */
async function started(w: World, people: Person[], settings: object = {}) {
    const created = data<TournamentDetailDto>(
        await w.asAnna.post(T.CREATE(w.group.id), {
            name: 'Toernooi',
            format: TournamentFormat.KNOCKOUT,
            participantMode: ParticipantMode.PLAYERS,
            ...settings,
        }),
    );
    for (const person of people) {
        await w.asAnna.post(
            T.ENTRIES(w.group.id, created.id),
            typeof person === 'string' ? { name: person } : person,
        );
    }
    const response = await w.asAnna.post(T.START(w.group.id, created.id));
    expect(response.status).toBe(200);
    return data<TournamentDetailDto>(response);
}

function entryOf(detail: TournamentDetailDto, name: string): string {
    const entry = detail.entries.find((candidate) => candidate.name === name);
    if (entry === undefined) throw new Error(`no entry ${name}`);
    return entry.id;
}

function matchAt(
    detail: TournamentDetailDto,
    round: number,
    position: number,
    stage = MatchStage.KNOCKOUT,
): TournamentMatchDto {
    const match = detail.matches.find(
        (candidate) =>
            candidate.stage === stage &&
            candidate.round === round &&
            candidate.position === position,
    );
    if (match === undefined) throw new Error(`no match ${String(round)}/${String(position)}`);
    return match;
}

/** The match between two entries, by name, whichever side each is on. */
function between(detail: TournamentDetailDto, a: string, b: string): TournamentMatchDto {
    const ids = new Set([entryOf(detail, a), entryOf(detail, b)]);
    const match = detail.matches.find(
        (candidate) =>
            candidate.homeEntryId !== null &&
            candidate.awayEntryId !== null &&
            ids.has(candidate.homeEntryId) &&
            ids.has(candidate.awayEntryId),
    );
    if (match === undefined) throw new Error(`no match ${a} v ${b}`);
    return match;
}

/** Enters `a b` as a's score against b's, on whichever sides they play. */
async function result(
    w: World,
    detail: TournamentDetailDto,
    a: string,
    aScore: number,
    bScore: number,
    b: string,
): Promise<TournamentDetailDto> {
    const match = between(detail, a, b);
    const aHome = match.homeEntryId === entryOf(detail, a);
    const response = await w.asAnna.put(T.RESULT(w.group.id, detail.id, match.id), {
        homeScore: aHome ? aScore : bScore,
        awayScore: aHome ? bScore : aScore,
    });
    expect(response.status).toBe(200);
    return data<TournamentDetailDto>(response);
}

describe('starting', () => {
    it('generates a knockout of five with the byes through', async () => {
        const w = await world();
        const detail = await started(w, [
            { userId: w.anna.id },
            { userId: w.bob.id },
            'G1',
            'G2',
            'G3',
        ]);
        expect(detail.status).toBe(TournamentStatus.RUNNING);
        expect(detail.startedAt).not.toBeNull();
        expect(detail.matches).toHaveLength(7);

        const byes = detail.matches.filter((match) => match.isBye);
        expect(byes.map((match) => match.winnerEntryId).sort()).toEqual(
            [entryOf(detail, 'Anna'), entryOf(detail, 'Bob'), entryOf(detail, 'G1')].sort(),
        );
        expect(byes.every((match) => match.status === MatchStatus.PLAYED)).toBe(true);
        // Seeds 2 and 3 already meet in the semi-final; seed 1 waits for 4 or 5.
        expect([matchAt(detail, 2, 1).homeEntryId, matchAt(detail, 2, 1).awayEntryId]).toEqual([
            entryOf(detail, 'Bob'),
            entryOf(detail, 'G1'),
        ]);
        expect(matchAt(detail, 2, 0).homeEntryId).toBe(entryOf(detail, 'Anna'));
        expect(matchAt(detail, 2, 0).awayEntryId).toBeNull();

        const again = await w.asAnna.post(T.START(w.group.id, detail.id));
        expect(error(again).details).toEqual({ problem: 'NOT_DRAFT' });
        const bye = byes[0];
        if (bye === undefined) throw new Error('no bye');
        const clearBye = await w.asAnna.delete(T.RESULT(w.group.id, detail.id, bye.id));
        expect(error(clearBye).details).toEqual({ problem: 'NOT_READY' });
    });

    it('will not start with fewer than two entries, or start for somebody else', async () => {
        const w = await world();
        const created = data<TournamentDetailDto>(
            await w.asAnna.post(T.CREATE(w.group.id), {
                name: 'Klein',
                format: TournamentFormat.KNOCKOUT,
                participantMode: ParticipantMode.PLAYERS,
            }),
        );
        await w.asAnna.post(T.ENTRIES(w.group.id, created.id), { name: 'Alleen' });
        const refused = await w.asAnna.post(T.START(w.group.id, created.id));
        expect(refused.status).toBe(422);
        expect(error(refused).details).toEqual({ problem: 'TOO_FEW_ENTRIES' });
        await w.asAnna.post(T.ENTRIES(w.group.id, created.id), { name: 'Twee' });
        expect((await w.asBob.post(T.START(w.group.id, created.id))).status).toBe(403);
    });
});

describe('results in a knockout', () => {
    /** Four players and a third-place match: Anna v G2 and Bob v G1 in the semi-finals. */
    async function semis(w: World) {
        return started(w, [{ userId: w.anna.id }, { userId: w.bob.id }, 'G1', 'G2'], {
            thirdPlace: true,
        });
    }

    it('lets a player enter their own result once, and the organiser correct it', async () => {
        const w = await world();
        let detail = await semis(w);
        const bobsMatch = between(detail, 'Bob', 'G1');
        const url = T.RESULT(w.group.id, detail.id, bobsMatch.id);

        const asBob = data<TournamentDetailDto>(await w.asBob.get(T.DETAIL(w.group.id, detail.id)));
        expect(asBob.myEntryIds).toEqual([entryOf(detail, 'Bob')]);
        expect(asBob.matches.filter((match) => match.canReport).map((match) => match.id)).toEqual([
            bobsMatch.id,
        ]);

        detail = data<TournamentDetailDto>(await w.asBob.put(url, { homeScore: 2, awayScore: 1 }));
        expect(matchAt(detail, 2, 0).awayEntryId).toBe(entryOf(detail, 'Bob'));
        expect(matchAt(detail, 2, 1).awayEntryId).toBe(entryOf(detail, 'G1'));
        // In now: Bob cannot change it, and the other semi-final is not his.
        expect((await w.asBob.put(url, { homeScore: 0, awayScore: 1 })).status).toBe(403);
        const notHis = between(detail, 'Anna', 'G2');
        expect(
            (
                await w.asBob.put(T.RESULT(w.group.id, detail.id, notHis.id), {
                    homeScore: 1,
                    awayScore: 0,
                })
            ).status,
        ).toBe(403);

        // An admin corrects it the other way: G1 goes on, Bob plays for third.
        detail = data<TournamentDetailDto>(await w.asCas.put(url, { homeScore: 1, awayScore: 3 }));
        expect(matchAt(detail, 2, 0).awayEntryId).toBe(entryOf(detail, 'G1'));
        expect(matchAt(detail, 2, 1).awayEntryId).toBe(entryOf(detail, 'Bob'));
    });

    it('refuses a draw, and a match still waiting for a side', async () => {
        const w = await world();
        const detail = await semis(w);
        const draw = await w.asAnna.put(
            T.RESULT(w.group.id, detail.id, between(detail, 'Anna', 'G2').id),
            { homeScore: 1, awayScore: 1 },
        );
        expect(draw.status).toBe(422);
        expect(error(draw).details).toEqual({ problem: 'DRAW_IN_KNOCKOUT' });
        const final = await w.asAnna.put(
            T.RESULT(w.group.id, detail.id, matchAt(detail, 2, 0).id),
            {
                homeScore: 1,
                awayScore: 0,
            },
        );
        expect(error(final).details).toEqual({ problem: 'NOT_READY' });
    });

    it('plays for third place and finishes on the final', async () => {
        const w = await world();
        let detail = await semis(w);
        detail = await result(w, detail, 'Anna', 3, 0, 'G2');
        detail = await result(w, detail, 'G1', 2, 1, 'Bob');
        const third = matchAt(detail, 2, 1);
        expect([third.homeEntryId, third.awayEntryId]).toEqual([
            entryOf(detail, 'G2'),
            entryOf(detail, 'Bob'),
        ]);

        const early = await w.asAnna.post(T.FINISH(w.group.id, detail.id));
        expect(error(early).details).toEqual({ problem: 'FINAL_UNPLAYED' });
        expect(detail.canFinish).toBe(false);

        detail = await result(w, detail, 'Anna', 2, 1, 'G1');
        expect(detail.canFinish).toBe(true);
        const finished = data<TournamentDetailDto>(
            await w.asAnna.post(T.FINISH(w.group.id, detail.id)),
        );
        expect(finished).toMatchObject({
            status: TournamentStatus.FINISHED,
            winnerEntryId: entryOf(detail, 'Anna'),
            winnerName: 'Anna',
        });
        const archive = data<TournamentListingDto[]>(
            await w.asBob.get(`${T.LIST(w.group.id)}?status=finished`),
        );
        expect(archive.map((item) => item.winnerName)).toEqual(['Anna']);
        const late = await w.asAnna.put(T.RESULT(w.group.id, detail.id, third.id), {
            homeScore: 1,
            awayScore: 0,
        });
        expect(error(late).details).toEqual({ problem: 'NOT_RUNNING' });
    });

    it('clears a result with what it put forward, unless a later match was played', async () => {
        const w = await world();
        let detail = await semis(w);
        detail = await result(w, detail, 'Anna', 3, 0, 'G2');
        detail = await result(w, detail, 'Bob', 2, 1, 'G1');
        const bobsMatch = between(detail, 'Bob', 'G1');
        const url = T.RESULT(w.group.id, detail.id, bobsMatch.id);

        expect((await w.asBob.delete(url)).status).toBe(403);
        detail = data<TournamentDetailDto>(await w.asAnna.delete(url));
        expect(matchAt(detail, 2, 0).awayEntryId).toBeNull();
        expect(matchAt(detail, 2, 1).awayEntryId).toBeNull();
        expect(between(detail, 'Bob', 'G1').status).toBe(MatchStatus.PENDING);

        detail = await result(w, detail, 'Bob', 2, 1, 'G1');
        detail = await result(w, detail, 'Anna', 1, 0, 'Bob');
        const blocked = await w.asAnna.delete(url);
        expect(blocked.status).toBe(409);
        expect(error(blocked).details).toEqual({ problem: 'LATER_PLAYED' });
        // Changing the winner is blocked the same way; a new score for the same winner is not.
        const flip = await w.asAnna.put(url, { homeScore: 0, awayScore: 1 });
        expect(error(flip).details).toEqual({ problem: 'LATER_PLAYED' });
        const sameWinner = between(detail, 'Bob', 'G1');
        const bobHome = sameWinner.homeEntryId === entryOf(detail, 'Bob');
        expect(
            (
                await w.asAnna.put(
                    url,
                    bobHome ? { homeScore: 5, awayScore: 0 } : { homeScore: 0, awayScore: 5 },
                )
            ).status,
        ).toBe(200);
    });
});

describe('a group stage', () => {
    it('plays every group, then advances the best into a knockout', async () => {
        const w = await world();
        // Seeds 1..6 dealt snake-wise: group 1 G1 G4 G5, group 2 G2 G3 G6.
        let detail = await started(w, ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'], {
            format: TournamentFormat.GROUPS_KNOCKOUT,
            groupCount: 2,
            advancePerGroup: 2,
        });
        expect(detail.matches).toHaveLength(6);
        expect(detail.matches.every((match) => match.stage === MatchStage.GROUP)).toBe(true);
        expect(detail.groups.map((group) => group.standings.length)).toEqual([3, 3]);
        expect(detail.canAdvance).toBe(false);
        const early = await w.asAnna.post(T.ADVANCE(w.group.id, detail.id));
        expect(error(early).details).toEqual({ problem: 'GROUPS_UNFINISHED' });

        detail = await result(w, detail, 'G1', 2, 0, 'G4');
        detail = await result(w, detail, 'G1', 1, 0, 'G5');
        // A draw is fine in a group.
        detail = await result(w, detail, 'G4', 1, 1, 'G5');
        detail = await result(w, detail, 'G2', 1, 0, 'G3');
        detail = await result(w, detail, 'G6', 2, 1, 'G2');
        detail = await result(w, detail, 'G3', 3, 0, 'G6');

        const table = (groupNo: number) =>
            detail.groups
                .find((group) => group.groupNo === groupNo)
                ?.standings.map((row) => [
                    detail.entries.find((entry) => entry.id === row.entryId)?.name,
                    row.points,
                    row.qualifies,
                ]);
        expect(table(1)).toEqual([
            ['G1', 6, true],
            ['G5', 1, true],
            ['G4', 1, false],
        ]);
        // All three on three points: score difference decides.
        expect(table(2)).toEqual([
            ['G3', 3, true],
            ['G2', 3, true],
            ['G6', 3, false],
        ]);
        expect(detail.canAdvance).toBe(true);

        detail = data<TournamentDetailDto>(await w.asAnna.post(T.ADVANCE(w.group.id, detail.id)));
        const knockout = detail.matches.filter((match) => match.stage === MatchStage.KNOCKOUT);
        expect(knockout).toHaveLength(3);
        // Winners against runners-up of the other group.
        expect([matchAt(detail, 1, 0).homeEntryId, matchAt(detail, 1, 0).awayEntryId]).toEqual([
            entryOf(detail, 'G1'),
            entryOf(detail, 'G2'),
        ]);
        expect([matchAt(detail, 1, 1).homeEntryId, matchAt(detail, 1, 1).awayEntryId]).toEqual([
            entryOf(detail, 'G3'),
            entryOf(detail, 'G5'),
        ]);
        const twice = await w.asAnna.post(T.ADVANCE(w.group.id, detail.id));
        expect(error(twice).details).toEqual({ problem: 'ALREADY_ADVANCED' });

        const plain = await started(w, ['A', 'B']);
        const notGroups = await w.asAnna.post(T.ADVANCE(w.group.id, plain.id));
        expect(error(notGroups).details).toEqual({ problem: 'NOT_GROUPS' });
    });
});
