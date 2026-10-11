import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import {
    API_ENDPOINTS,
    ActivityCategory,
    GroupRole,
    ParticipantMode,
    TournamentFormat,
    TournamentStatus,
} from '@bzim/types';
import type { TournamentDetailDto, TournamentListingDto } from '@bzim/types';

import Tournament from '../src/app/domain/models/Tournament.entity';
import TournamentEntryMember from '../src/app/domain/models/TournamentEntryMember.entity';
import { sessionFor } from './support/auth';
import { asUser, data, error } from './support/client';
import { seedActivity, seedGroup, seedMember, seedUser } from './support/factories';

const T = API_ENDPOINTS.TOURNAMENTS;
const KNOCKOUT = {
    name: 'Pingpong',
    format: TournamentFormat.KNOCKOUT,
    participantMode: ParticipantMode.PLAYERS,
};

/** Anna organises; Bob is a member, Cas an admin, Dirk not in the group. */
async function world() {
    const owner = await seedUser({ displayName: 'Milo' });
    const group = await seedGroup(owner, { name: 'Vrienden' });
    const anna = await seedUser({ displayName: 'Anna' });
    const bob = await seedUser({ displayName: 'Bob' });
    const cas = await seedUser({ displayName: 'Cas' });
    await seedMember(group, anna);
    await seedMember(group, bob);
    await seedMember(group, cas, GroupRole.ADMIN);
    const dirk = await seedUser({ displayName: 'Dirk' });
    const as = async (user: Awaited<ReturnType<typeof seedUser>>) =>
        asUser((await sessionFor(user)).accessToken);
    return {
        owner,
        group,
        anna,
        bob,
        cas,
        dirk,
        asAnna: await as(anna),
        asBob: await as(bob),
        asCas: await as(cas),
        asDirk: await as(dirk),
    };
}

type World = Awaited<ReturnType<typeof world>>;

async function create(w: World, settings: object = {}): Promise<TournamentDetailDto> {
    const response = await w.asAnna.post(T.CREATE(w.group.id), { ...KNOCKOUT, ...settings });
    expect(response.status).toBe(201);
    return data<TournamentDetailDto>(response);
}

async function addGuests(w: World, tournament: TournamentDetailDto, ...names: string[]) {
    let detail = tournament;
    for (const name of names) {
        detail = data<TournamentDetailDto>(
            await w.asAnna.post(T.ENTRIES(w.group.id, tournament.id), { name }),
        );
    }
    return detail;
}

const names = (detail: TournamentDetailDto) => detail.entries.map((entry) => entry.name);

describe('creating a tournament', () => {
    it('makes a draft any member can see, with the defaults', async () => {
        const w = await world();
        const created = await create(w);
        expect(created).toMatchObject({
            name: 'Pingpong',
            status: TournamentStatus.DRAFT,
            winPoints: 3,
            drawPoints: 1,
            thirdPlace: false,
            teamSize: null,
            groupCount: null,
            organiserName: 'Anna',
            canManage: true,
            startProblem: 'TOO_FEW_ENTRIES',
            entries: [],
            matches: [],
            groups: [],
        });
        const asBob = data<TournamentDetailDto>(
            await w.asBob.get(T.DETAIL(w.group.id, created.id)),
        );
        expect(asBob.canManage).toBe(false);
        expect((await w.asDirk.get(T.DETAIL(w.group.id, created.id))).status).toBe(404);
        // Not through a group of his own either: the tournament is looked up in the group in the path.
        const elsewhere = await seedGroup(w.dirk, { name: 'Anders' });
        expect((await w.asDirk.get(T.DETAIL(elsewhere.id, created.id))).status).toBe(404);
        expect((await w.asDirk.post(T.START(elsewhere.id, created.id))).status).toBe(404);
    });

    it('ties to a tournament activity of the group, and to nothing else', async () => {
        const w = await world();
        const activity = await seedActivity(w.group, w.anna, {
            title: 'Pingpongavond',
            category: ActivityCategory.TOURNAMENT,
        });
        const created = await create(w, { activityId: activity.id });
        expect(created.activity).toEqual({ id: activity.id, title: 'Pingpongavond' });

        const sports = await seedActivity(w.group, w.anna, { category: ActivityCategory.SPORTS });
        const refused = await w.asAnna.post(T.CREATE(w.group.id), {
            ...KNOCKOUT,
            activityId: sports.id,
        });
        expect(refused.status).toBe(422);
        expect(error(refused).details).toEqual({ problem: 'ACTIVITY' });

        const linked = data<TournamentListingDto[]>(
            await w.asBob.get(`${T.LIST(w.group.id)}?activityId=${activity.id}`),
        );
        expect(linked.map((item) => item.id)).toEqual([created.id]);
    });

    it('refuses settings that disagree, and clears what does not apply', async () => {
        const w = await world();
        const problem = async (settings: object) =>
            error(await w.asAnna.post(T.CREATE(w.group.id), { ...KNOCKOUT, ...settings })).details;
        expect(await problem({ participantMode: ParticipantMode.TEAMS })).toEqual({
            problem: 'TEAM_SIZE',
        });
        expect(await problem({ format: TournamentFormat.GROUPS_KNOCKOUT })).toEqual({
            problem: 'GROUPS',
        });
        expect(await problem({ winPoints: 3, drawPoints: 4 })).toEqual({ problem: 'POINTS' });

        const cleared = await create(w, { groupCount: 2, advancePerGroup: 1, teamSize: 3 });
        expect(cleared).toMatchObject({ groupCount: null, advancePerGroup: null, teamSize: null });
    });

    it('lets the organiser and admins change the settings, nobody else', async () => {
        const w = await world();
        const created = await create(w);
        const url = T.DETAIL(w.group.id, created.id);
        expect((await w.asBob.patch(url, { name: 'Tafeltennis' })).status).toBe(403);
        expect(
            data<TournamentDetailDto>(await w.asAnna.patch(url, { name: 'Tafeltennis' })).name,
        ).toBe('Tafeltennis');
        expect(
            data<TournamentDetailDto>(await w.asCas.patch(url, { thirdPlace: true })).thirdPlace,
        ).toBe(true);
    });
});

describe('entries', () => {
    it('adds members and guests as players, each person once', async () => {
        const w = await world();
        const created = await create(w);
        const url = T.ENTRIES(w.group.id, created.id);

        const withBob = data<TournamentDetailDto>(await w.asAnna.post(url, { userId: w.bob.id }));
        expect(withBob.entries[0]).toMatchObject({ name: 'Bob', seed: 1, groupNo: null });
        expect(withBob.entries[0]?.members[0]?.user?.id).toBe(w.bob.id);

        const withGuest = data<TournamentDetailDto>(await w.asAnna.post(url, { name: 'Gast' }));
        expect(withGuest.entries[1]).toMatchObject({ name: 'Gast', seed: 2 });
        expect(withGuest.entries[1]?.members[0]).toMatchObject({ user: null, avatarKey: null });

        const twice = await w.asAnna.post(url, { userId: w.bob.id });
        expect(twice.status).toBe(409);
        expect(error(twice).details).toEqual({ problem: 'ALREADY_IN' });
        const stranger = await w.asAnna.post(url, { userId: w.dirk.id });
        expect(error(stranger).details).toEqual({ problem: 'NOT_A_GROUP_MEMBER' });
        const team = await w.asAnna.post(url, { members: [{ name: 'X' }, { name: 'Y' }] });
        expect(error(team).details).toEqual({ problem: 'TEAM_SIZE' });
        expect((await w.asBob.post(url, { name: 'Z' })).status).toBe(403);
    });

    it('builds teams up to the team size, a single person being a team of one', async () => {
        const w = await world();
        const created = await create(w, { participantMode: ParticipantMode.TEAMS, teamSize: 2 });
        const url = T.ENTRIES(w.group.id, created.id);

        const team = data<TournamentDetailDto>(
            await w.asAnna.post(url, {
                name: 'De Snelle',
                members: [{ userId: w.anna.id }, { name: 'Gast' }],
            }),
        );
        expect(team.entries[0]?.name).toBe('De Snelle');
        expect(team.entries[0]?.members.map((member) => member.displayName)).toEqual([
            'Anna',
            'Gast',
        ]);
        const unnamed = data<TournamentDetailDto>(
            await w.asAnna.post(url, { members: [{ userId: w.bob.id }, { userId: w.cas.id }] }),
        );
        expect(unnamed.entries[1]?.name).toBe('Bob & Cas');

        const three = await w.asAnna.post(url, {
            members: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        });
        expect(error(three).details).toEqual({ problem: 'TEAM_SIZE' });
        const single = data<TournamentDetailDto>(await w.asAnna.post(url, { name: 'Solo' }));
        expect(single.entries[2]?.members).toHaveLength(1);
    });

    it('moves an entry in the draw and the rest shift; removing one closes the gap', async () => {
        const w = await world();
        let detail = await addGuests(w, await create(w), 'A', 'B', 'C', 'D');
        const last = detail.entries[3];
        if (last === undefined) throw new Error('no entry D');

        detail = data<TournamentDetailDto>(
            await w.asAnna.patch(T.ENTRY(w.group.id, detail.id, last.id), { seed: 1 }),
        );
        expect(names(detail)).toEqual(['D', 'A', 'B', 'C']);
        expect(detail.entries.map((entry) => entry.seed)).toEqual([1, 2, 3, 4]);

        const first = detail.entries[1];
        if (first === undefined) throw new Error('no entry A');
        detail = data<TournamentDetailDto>(
            await w.asAnna.delete(T.ENTRY(w.group.id, detail.id, first.id)),
        );
        expect(names(detail)).toEqual(['D', 'B', 'C']);
        expect(detail.entries.map((entry) => entry.seed)).toEqual([1, 2, 3]);

        const renamed = data<TournamentDetailDto>(
            await w.asAnna.patch(T.ENTRY(w.group.id, detail.id, last.id), { name: 'Dees' }),
        );
        expect(renamed.entries[0]?.name).toBe('Dees');
    });

    it('deals the groups snake-wise as entries come in, and lets one move', async () => {
        const w = await world();
        let detail = await addGuests(
            w,
            await create(w, {
                format: TournamentFormat.GROUPS_KNOCKOUT,
                groupCount: 2,
                advancePerGroup: 1,
            }),
            'A',
            'B',
            'C',
            'D',
        );
        expect(detail.entries.map((entry) => entry.groupNo)).toEqual([1, 2, 2, 1]);

        const a = detail.entries[0];
        if (a === undefined) throw new Error('no entry A');
        const tooFar = await w.asAnna.patch(T.ENTRY(w.group.id, detail.id, a.id), { groupNo: 3 });
        expect(error(tooFar).details).toEqual({ problem: 'GROUPS' });
        detail = data<TournamentDetailDto>(
            await w.asAnna.patch(T.ENTRY(w.group.id, detail.id, a.id), { groupNo: 2 }),
        );
        expect(detail.entries[0]?.groupNo).toBe(2);

        detail = data<TournamentDetailDto>(
            await w.asAnna.patch(T.DETAIL(w.group.id, detail.id), { groupCount: 1 }),
        );
        expect(detail.entries.map((entry) => entry.groupNo)).toEqual([1, 1, 1, 1]);
    });
});

describe('the draw', () => {
    it('shuffles the seeds, keeping every entry', async () => {
        const w = await world();
        const detail = await addGuests(w, await create(w), 'A', 'B', 'C', 'D', 'E', 'F');
        const drawn = data<TournamentDetailDto>(
            await w.asAnna.post(T.DRAW(w.group.id, detail.id), {}),
        );
        expect(drawn.entries.map((entry) => entry.seed)).toEqual([1, 2, 3, 4, 5, 6]);
        expect([...names(drawn)].sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
        // Even without a body.
        expect((await w.asAnna.post(T.DRAW(w.group.id, detail.id))).status).toBe(200);
        expect((await w.asBob.post(T.DRAW(w.group.id, detail.id), {})).status).toBe(403);
    });

    it('deals the people into random teams, as even as they come out', async () => {
        const w = await world();
        const created = await create(w, { participantMode: ParticipantMode.TEAMS, teamSize: 2 });
        await w.asAnna.post(T.ENTRIES(w.group.id, created.id), { userId: w.bob.id });
        const detail = await addGuests(w, created, 'A', 'B', 'C', 'D');

        const drawn = data<TournamentDetailDto>(
            await w.asAnna.post(T.DRAW(w.group.id, detail.id), { teams: true }),
        );
        expect(drawn.entries.map((entry) => entry.members.length).sort()).toEqual([1, 2, 2]);
        expect(
            drawn.entries
                .flatMap((entry) => entry.members.map((member) => member.displayName))
                .sort(),
        ).toEqual(['A', 'B', 'Bob', 'C', 'D']);
        const bobs = drawn.entries.find((entry) =>
            entry.members.some((member) => member.user?.id === w.bob.id),
        );
        expect(bobs?.name).toContain('Bob');

        const lonely = await addGuests(
            w,
            await create(w, { participantMode: ParticipantMode.TEAMS, teamSize: 2 }),
            'Solo',
        );
        const refused = await w.asAnna.post(T.DRAW(w.group.id, lonely.id), { teams: true });
        expect(error(refused).details).toEqual({ problem: 'TOO_FEW_PEOPLE' });
    });
});

describe('the list', () => {
    it('shows what is on, running first, and keeps the archive apart', async () => {
        const w = await world();
        await create(w, { name: 'Concept' });
        const running = await addGuests(w, await create(w, { name: 'Bezig' }), 'A', 'B');
        await w.asAnna.post(T.START(w.group.id, running.id));
        const done = await create(w, { name: 'Klaar' });
        await Tournament.update(done.id, {
            status: TournamentStatus.FINISHED,
            finishedAt: DateTime.utc().toJSDate(),
        });

        const on = data<TournamentListingDto[]>(await w.asBob.get(T.LIST(w.group.id)));
        expect(on.map((item) => item.name)).toEqual(['Bezig', 'Concept']);
        expect(on[0]).toMatchObject({ status: TournamentStatus.RUNNING, entryCount: 2 });
        const archive = data<TournamentListingDto[]>(
            await w.asBob.get(`${T.LIST(w.group.id)}?status=finished`),
        );
        expect(archive.map((item) => item.id)).toEqual([done.id]);
    });

    it('deletes for the organiser or an admin', async () => {
        const w = await world();
        const created = await create(w);
        const url = T.DETAIL(w.group.id, created.id);
        expect((await w.asBob.delete(url)).status).toBe(403);
        expect((await w.asCas.delete(url)).status).toBe(204);
        expect((await w.asAnna.get(url)).status).toBe(404);
    });

    it('locks the setup once started, but not the name', async () => {
        const w = await world();
        const detail = await addGuests(w, await create(w), 'A', 'B');
        await w.asAnna.post(T.START(w.group.id, detail.id));
        const url = T.DETAIL(w.group.id, detail.id);
        const locked = await w.asAnna.patch(url, { thirdPlace: true });
        expect(locked.status).toBe(409);
        expect(error(locked).details).toEqual({ problem: 'NOT_DRAFT' });
        expect((await w.asAnna.patch(url, { name: 'Finale' })).status).toBe(200);
        expect((await w.asAnna.post(T.ENTRIES(w.group.id, detail.id), { name: 'C' })).status).toBe(
            409,
        );
        expect((await w.asAnna.post(T.DRAW(w.group.id, detail.id), {})).status).toBe(409);
    });
});

describe('leaving the group', () => {
    it('keeps the leaver as a name in the entries and as organiser', async () => {
        const w = await world();
        const bobs = data<TournamentDetailDto>(
            await w.asBob.post(T.CREATE(w.group.id), { ...KNOCKOUT, name: 'Van Bob' }),
        );
        await w.asBob.post(T.ENTRIES(w.group.id, bobs.id), { userId: w.bob.id });

        expect((await w.asBob.post(API_ENDPOINTS.GROUPS.LEAVE(w.group.id))).status).toBe(204);

        const member = await TournamentEntryMember.findOneByOrFail({ displayNameSnapshot: 'Bob' });
        expect(member.userId).toBeNull();
        const after = data<TournamentDetailDto>(await w.asCas.get(T.DETAIL(w.group.id, bobs.id)));
        expect(after).toMatchObject({ organiserName: 'Bob', organiser: null, canManage: true });
        expect(after.entries[0]?.members[0]).toMatchObject({ user: null, displayName: 'Bob' });
    });
});
