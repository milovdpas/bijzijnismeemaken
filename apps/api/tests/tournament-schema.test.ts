import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { ActivityCategory, MatchSlot, MatchStage, MatchStatus } from '@bzim/types';

import Activity from '../src/app/models/Activity.entity';
import Group from '../src/app/models/Group.entity';
import Tournament from '../src/app/models/Tournament.entity';
import TournamentEntry from '../src/app/models/TournamentEntry.entity';
import TournamentEntryMember from '../src/app/models/TournamentEntryMember.entity';
import TournamentMatch from '../src/app/models/TournamentMatch.entity';
import User from '../src/app/models/User.entity';
import {
    seedActivity,
    seedGroup,
    seedTournament,
    seedTournamentEntry,
    seedUser,
} from './support/factories';

/**
 * The tournament tables' constraints against the real database (task 45).
 * The winner key makes a cycle (a tournament points at one of its own
 * entries), so deleting a tournament with a winner is checked explicitly.
 */

async function bracket() {
    const owner = await seedUser({ displayName: 'Milo' });
    const anna = await seedUser({ displayName: 'Anna' });
    const group = await seedGroup(owner);
    const activity = await seedActivity(group, owner, { category: ActivityCategory.TOURNAMENT });
    const tournament = await seedTournament(group, owner, { activityId: activity.id });
    const first = await seedTournamentEntry(tournament, 1, [owner, 'Gast']);
    const second = await seedTournamentEntry(tournament, 2, [anna]);
    const final = await TournamentMatch.create({
        tournamentId: tournament.id,
        stage: MatchStage.KNOCKOUT,
        groupNo: null,
        round: 1,
        position: 0,
        homeEntryId: first.id,
        awayEntryId: second.id,
        homeScore: 3,
        awayScore: 1,
        winnerEntryId: first.id,
        status: MatchStatus.PLAYED,
        nextMatchId: null,
        nextSlot: null,
        reportedById: anna.id,
        playedAt: DateTime.utc().toJSDate(),
    }).save();
    // A match before it that feeds the final, to have the self-reference filled.
    const semi = await TournamentMatch.create({
        tournamentId: tournament.id,
        stage: MatchStage.KNOCKOUT,
        groupNo: null,
        round: 1,
        position: 1,
        homeEntryId: second.id,
        awayEntryId: null,
        homeScore: null,
        awayScore: null,
        winnerEntryId: second.id,
        status: MatchStatus.PLAYED,
        nextMatchId: final.id,
        nextSlot: MatchSlot.AWAY,
        reportedById: null,
        playedAt: null,
    }).save();
    tournament.winnerEntryId = first.id;
    await tournament.save();
    return { owner, anna, group, activity, tournament, first, second, final, semi };
}

describe('tournament schema', () => {
    it('stores the defaults a new tournament gets', async () => {
        const owner = await seedUser();
        const tournament = await seedTournament(await seedGroup(owner), owner);
        const fresh = await Tournament.findOneByOrFail({ id: tournament.id });
        expect(fresh).toMatchObject({
            status: 'draft',
            winPoints: 3,
            drawPoints: 1,
            thirdPlace: false,
        });
        expect(fresh.isCreatedBy(owner.id)).toBe(true);
    });

    it('keeps the people of an entry, guests with a name and no account', async () => {
        const { first } = await bracket();
        const members = await TournamentEntryMember.find({
            where: { entryId: first.id },
            order: { displayNameSnapshot: 'ASC' },
        });
        expect(
            members.map((member) => [member.displayNameSnapshot, member.userId === null]),
        ).toEqual([
            ['Gast', true],
            ['Milo', false],
        ]);
        expect(first.name).toBe('Milo & Gast');
    });

    it('refuses two entries on one seed', async () => {
        const { tournament } = await bracket();
        await expect(seedTournamentEntry(tournament, 2, ['Bob'])).rejects.toThrow(
            /Duplicate entry/,
        );
    });

    it('takes everything with it when a tournament with a winner goes', async () => {
        const { tournament } = await bracket();
        await Tournament.delete({ id: tournament.id });
        expect(await TournamentEntry.count()).toBe(0);
        expect(await TournamentEntryMember.count()).toBe(0);
        expect(await TournamentMatch.count()).toBe(0);
    });

    it('goes with its group, and outlives its activity', async () => {
        const { group, activity, tournament } = await bracket();
        await Activity.delete({ id: activity.id });
        expect((await Tournament.findOneByOrFail({ id: tournament.id })).activityId).toBeNull();
        await Group.delete({ id: group.id });
        expect(await Tournament.count()).toBe(0);
        expect(await TournamentMatch.count()).toBe(0);
    });

    it('keeps the names, and the tournament, when an account goes', async () => {
        const { anna, group, final } = await bracket();
        const hers = await seedTournament(group, anna);
        await User.delete({ id: anna.id });
        expect((await TournamentMatch.findOneByOrFail({ id: final.id })).reportedById).toBeNull();
        const annaRow = await TournamentEntryMember.findOneByOrFail({
            displayNameSnapshot: 'Anna',
        });
        expect(annaRow.userId).toBeNull();
        expect((await Tournament.findOneByOrFail({ id: hers.id })).createdById).toBeNull();
    });

    it('lets go of a removed entry in the matches and as winner', async () => {
        const { tournament, first, final, semi } = await bracket();
        await TournamentEntry.delete({ id: first.id });
        expect((await Tournament.findOneByOrFail({ id: tournament.id })).winnerEntryId).toBeNull();
        const after = await TournamentMatch.findOneByOrFail({ id: final.id });
        expect([after.homeEntryId, after.winnerEntryId]).toEqual([null, null]);
        await TournamentMatch.delete({ id: final.id });
        expect((await TournamentMatch.findOneByOrFail({ id: semi.id })).nextMatchId).toBeNull();
    });
});
