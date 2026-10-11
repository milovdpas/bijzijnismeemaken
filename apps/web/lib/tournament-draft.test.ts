import { describe, expect, it } from 'vitest';
import { ParticipantMode } from '@bzim/types';
import type { TournamentEntryDto, TournamentMemberDto } from '@bzim/types';

import {
    bySeed,
    canDealTeams,
    draftGroups,
    dropPatch,
    groupPatch,
    playingUserIds,
    randomTeamCount,
    stepPatch,
    teamNameFor,
} from './tournament-draft';

function person(name: string, userId: string | null = null): TournamentMemberDto {
    return {
        id: `m-${name}`,
        user:
            userId === null
                ? null
                : { id: userId, handle: name.toLowerCase(), displayName: name, avatarKey: 'cat' },
        displayName: name,
        avatarKey: userId === null ? null : 'cat',
    };
}

function entry(
    id: string,
    seed: number,
    groupNo: number | null = null,
    members: TournamentMemberDto[] = [person(id)],
): TournamentEntryDto {
    return { id, name: id, seed, groupNo, members };
}

describe('tournament draft', () => {
    it('orders by seed and deals the groups, empty ones too', () => {
        const entries = [entry('c', 3, 1), entry('a', 1, 1), entry('b', 2, 2)];
        expect(bySeed(entries).map((e) => e.id)).toEqual(['a', 'b', 'c']);
        expect(
            draftGroups({ groupCount: 3, entries }).map((group) => [
                group.groupNo,
                group.entries.map((e) => e.id),
            ]),
        ).toEqual([
            [1, ['a', 'c']],
            [2, ['b']],
            [3, []],
        ]);
    });

    it('knows who plays already, guests aside', () => {
        const entries = [
            entry('a', 1, null, [person('Anna', 'u-anna'), person('Guest')]),
            entry('b', 2, null, [person('Bob', 'u-bob')]),
        ];
        expect([...playingUserIds(entries)].sort()).toEqual(['u-anna', 'u-bob']);
    });

    it('deals random teams only with people for two of them', () => {
        expect(randomTeamCount(5, 2)).toBe(3);
        expect(randomTeamCount(2, 2)).toBe(1);
        const teams = (n: number) => ({
            participantMode: ParticipantMode.TEAMS,
            teamSize: 2,
            entries: Array.from({ length: n }, (_, i) => entry(`p${String(i)}`, i + 1)),
        });
        expect(canDealTeams(teams(2))).toBe(false);
        expect(canDealTeams(teams(3))).toBe(true);
        expect(canDealTeams({ ...teams(4), participantMode: ParticipantMode.PLAYERS })).toBe(false);
    });

    it('drops onto another entry: its seed, and its group when that differs', () => {
        const a = entry('a', 1, 1);
        const b = entry('b', 4, 1);
        const c = entry('c', 2, 2);
        expect(dropPatch(a, a)).toBeNull();
        expect(dropPatch(a, b)).toEqual({ seed: 4 });
        expect(dropPatch(a, c)).toEqual({ seed: 2, groupNo: 2 });
        expect(groupPatch(a, 1)).toBeNull();
        expect(groupPatch(a, 3)).toEqual({ groupNo: 3 });
    });

    it('steps to the neighbour in the same list, not past either end', () => {
        const group = [entry('a', 1, 1), entry('b', 4, 1), entry('c', 6, 1)];
        expect(stepPatch(group, 'b', -1)).toEqual({ seed: 1 });
        expect(stepPatch(group, 'b', 1)).toEqual({ seed: 6 });
        expect(stepPatch(group, 'a', -1)).toBeNull();
        expect(stepPatch(group, 'c', 1)).toBeNull();
        expect(stepPatch(group, 'nobody', 1)).toBeNull();
    });

    it('names a team after its people', () => {
        expect(teamNameFor(['Anna', 'Bob'])).toBe('Anna & Bob');
        expect(teamNameFor(['x'.repeat(50), 'y'.repeat(50)])).toHaveLength(60);
    });
});
