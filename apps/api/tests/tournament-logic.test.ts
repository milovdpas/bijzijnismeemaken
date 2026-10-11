import { describe, expect, it } from 'vitest';
import { MatchSlot, MatchStage } from '@bzim/types';

import {
    bracketOrder,
    bracketSize,
    hasThirdPlace,
    knockoutPlan,
    nextOf,
    thirdPlaceSlot,
} from '../src/app/domain/tournaments/bracket';
import type { KnockoutEntrant, PlannedMatch } from '../src/app/domain/tournaments/bracket';
import { roundRobinPlan, snakeGroups } from '../src/app/domain/tournaments/round-robin';
import { qualifiers, standings } from '../src/app/domain/tournaments/standings';
import type { PlayedMatch } from '../src/app/domain/tournaments/standings';

/** Entrants `e1` to `eN`, in seed order, from no group. */
function seeds(count: number, group: (index: number) => number | null = () => null) {
    return Array.from({ length: count }, (_, index) => ({
        id: `e${String(index + 1)}`,
        group: group(index),
    }));
}

function at(matches: PlannedMatch[], round: number, position: number): PlannedMatch {
    const match = matches.find((item) => item.round === round && item.position === position);
    if (match === undefined) throw new Error(`no match ${String(round)}/${String(position)}`);
    return match;
}

const sides = (match: PlannedMatch) => [match.homeId, match.awayId];

function played(homeId: string, homeScore: number, awayScore: number, awayId: string): PlayedMatch {
    return { homeId, awayId, homeScore, awayScore };
}

describe('knockout bracket', () => {
    it('places seeds so the best meet last', () => {
        expect(bracketOrder(2)).toEqual([1, 2]);
        expect(bracketOrder(4)).toEqual([1, 4, 2, 3]);
        expect(bracketOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
        expect(bracketOrder(16).slice(0, 4)).toEqual([1, 16, 8, 9]);
        expect([1, 2, 3, 5, 8, 9].map(bracketSize)).toEqual([1, 2, 4, 8, 8, 16]);
    });

    it('sends every winner up to the right side of the next match', () => {
        expect(nextOf(1, 0)).toEqual({ round: 2, position: 0, slot: MatchSlot.HOME });
        expect(nextOf(1, 1)).toEqual({ round: 2, position: 0, slot: MatchSlot.AWAY });
        expect(nextOf(2, 3)).toEqual({ round: 3, position: 1, slot: MatchSlot.AWAY });
    });

    it('plans a full bracket of eight', () => {
        const plan = knockoutPlan(seeds(8), false);
        expect(plan).toHaveLength(7);
        expect(plan.every((match) => match.stage === MatchStage.KNOCKOUT)).toBe(true);
        expect([0, 1, 2, 3].map((position) => sides(at(plan, 1, position)))).toEqual([
            ['e1', 'e8'],
            ['e4', 'e5'],
            ['e2', 'e7'],
            ['e3', 'e6'],
        ]);
        expect(sides(at(plan, 2, 0))).toEqual([null, null]);
        expect(at(plan, 1, 3).next).toEqual({ round: 2, position: 1, slot: MatchSlot.AWAY });
        expect(at(plan, 3, 0).next).toBeNull();
        expect(plan.some((match) => match.winnerId !== null)).toBe(false);
    });

    it('gives the byes of an uneven field to the top seeds, already through', () => {
        const plan = knockoutPlan(seeds(5), false);
        // Eight places for five: three byes, for seeds 1, 2 and 3.
        expect(sides(at(plan, 1, 0))).toEqual(['e1', null]);
        expect(at(plan, 1, 0).winnerId).toBe('e1');
        expect(sides(at(plan, 1, 1))).toEqual(['e4', 'e5']);
        expect(at(plan, 1, 1).winnerId).toBeNull();
        expect(at(plan, 1, 2).winnerId).toBe('e2');
        expect(at(plan, 1, 3).winnerId).toBe('e3');
        // Through to the semi-finals, where 2 and 3 already meet.
        expect(sides(at(plan, 2, 0))).toEqual(['e1', null]);
        expect(sides(at(plan, 2, 1))).toEqual(['e2', 'e3']);
        expect(plan.filter((match) => match.round === 1 && match.winnerId !== null)).toHaveLength(
            3,
        );
    });

    it('plays two as a final and three with one bye', () => {
        const two = knockoutPlan(seeds(2), true);
        expect(two).toHaveLength(1);
        expect(sides(at(two, 1, 0))).toEqual(['e1', 'e2']);
        expect(at(two, 1, 0).next).toBeNull();
        const three = knockoutPlan(seeds(3), true);
        expect(three).toHaveLength(3);
        expect(sides(at(three, 2, 0))).toEqual(['e1', null]);
        expect(() => knockoutPlan(seeds(1), false)).toThrow();
    });

    it('adds a third-place match beside the final, from four entrants', () => {
        const plan = knockoutPlan(seeds(4), true);
        expect(plan).toHaveLength(4);
        const third = at(plan, 2, 1);
        expect(sides(third)).toEqual([null, null]);
        expect(third.next).toBeNull();
        expect(at(plan, 2, 0).next).toBeNull();
        expect(hasThirdPlace(3, true)).toBe(false);
        expect(hasThirdPlace(4, false)).toBe(false);
        expect(thirdPlaceSlot(0)).toBe(MatchSlot.HOME);
        expect(thirdPlaceSlot(1)).toBe(MatchSlot.AWAY);
    });

    it('keeps the two from one group apart in the first round', () => {
        // Three groups of two qualifiers, in qualifier order: A1 B1 C1 A2 B2 C2.
        const entrants: KnockoutEntrant[] = [
            { id: 'A1', group: 1 },
            { id: 'B1', group: 2 },
            { id: 'C1', group: 3 },
            { id: 'A2', group: 1 },
            { id: 'B2', group: 2 },
            { id: 'C2', group: 3 },
        ];
        const plan = knockoutPlan(entrants, false);
        const groupOf = new Map(entrants.map((entrant) => [entrant.id, entrant.group]));
        for (const match of plan.filter((item) => item.round === 1)) {
            if (match.homeId !== null && match.awayId !== null) {
                expect(groupOf.get(match.homeId)).not.toBe(groupOf.get(match.awayId));
            }
        }
        // The byes still go to the group winners at the top.
        expect(at(plan, 1, 0).winnerId).toBe('A1');
        expect(at(plan, 1, 2).winnerId).toBe('B1');
    });
});

describe('group stage', () => {
    it('deals the seeds over the groups snake-wise', () => {
        expect(snakeGroups(8, 2)).toEqual([1, 2, 2, 1, 1, 2, 2, 1]);
        expect(snakeGroups(9, 3)).toEqual([1, 2, 3, 3, 2, 1, 1, 2, 3]);
        expect(snakeGroups(3, 1)).toEqual([1, 1, 1]);
    });

    it('pairs everybody once, nobody twice in a round, home and away even', () => {
        for (let count = 2; count <= 9; count += 1) {
            const ids = seeds(count).map((entrant) => entrant.id);
            const plan = roundRobinPlan(2, ids);
            expect(plan).toHaveLength((count * (count - 1)) / 2);
            expect(plan.every((match) => match.stage === MatchStage.GROUP)).toBe(true);
            expect(plan.every((match) => match.groupNo === 2 && match.next === null)).toBe(true);

            const pairs = new Set(
                plan.map((match) => [match.homeId, match.awayId].sort().join('-')),
            );
            expect(pairs.size).toBe(plan.length);

            const rounds = new Set(plan.map((match) => match.round));
            expect(rounds.size).toBe(count % 2 === 0 ? count - 1 : count);
            for (const round of rounds) {
                const inRound = plan.filter((match) => match.round === round);
                const playing = inRound.flatMap(sides);
                expect(new Set(playing).size).toBe(playing.length);
                expect(inRound.map((match) => match.position)).toEqual(
                    inRound.map((_, index) => index),
                );
            }

            for (const id of ids) {
                const home = plan.filter((match) => match.homeId === id).length;
                const away = plan.filter((match) => match.awayId === id).length;
                expect(home + away).toBe(count - 1);
                expect(Math.abs(home - away)).toBeLessThanOrEqual(1);
            }
        }
    });
});

describe('standings', () => {
    const points = { win: 3, draw: 1 };
    const four = ['A', 'B', 'C', 'D'].map((id, index) => ({ id, seed: index + 1 }));

    it('counts the record and orders by points, then difference, then scored', () => {
        const table = standings(
            four,
            [
                played('A', 2, 1, 'B'),
                played('C', 0, 0, 'D'),
                played('A', 1, 1, 'C'),
                played('B', 3, 0, 'D'),
                played('A', 0, 2, 'D'),
                played('B', 1, 0, 'C'),
            ],
            points,
        );
        expect(table.map((row) => row.entryId)).toEqual(['B', 'A', 'D', 'C']);
        expect(table[0]).toEqual({
            entryId: 'B',
            played: 3,
            won: 2,
            drawn: 0,
            lost: 1,
            scored: 5,
            conceded: 2,
            difference: 3,
            points: 6,
            rank: 1,
        });
        // A and D are level on points and difference; A scored more.
        expect(table.find((row) => row.entryId === 'A')).toMatchObject({ points: 4, scored: 3 });
        expect(table.find((row) => row.entryId === 'D')).toMatchObject({ points: 4, scored: 2 });
        expect(table.map((row) => row.rank)).toEqual([1, 2, 3, 4]);
    });

    it('settles a level pair by the match between them before the seed', () => {
        const entries = ['X', 'Y', 'Z', 'W'].map((id, index) => ({ id, seed: index + 1 }));
        const table = standings(
            entries,
            [
                played('Y', 1, 0, 'X'),
                played('X', 1, 0, 'Z'),
                played('Z', 1, 0, 'Y'),
                played('W', 0, 0, 'X'),
                played('W', 0, 0, 'Y'),
                played('W', 1, 0, 'Z'),
            ],
            points,
        );
        // X and Y: 4 points, 1-1 each. Y beat X, so Y is above despite the seed.
        expect(table.map((row) => row.entryId)).toEqual(['W', 'Y', 'X', 'Z']);
    });

    it('falls back to the seed when even the matches among them are level', () => {
        const entries = ['E', 'F', 'G'].map((id, index) => ({ id, seed: index + 1 }));
        const circle = [played('E', 1, 0, 'F'), played('F', 1, 0, 'G'), played('G', 1, 0, 'E')];
        expect(standings(entries, circle, points).map((row) => row.entryId)).toEqual([
            'E',
            'F',
            'G',
        ]);
        // Nothing played yet: the seed order, everybody on nought.
        const start = standings([...entries].reverse(), [], points);
        expect(start.map((row) => row.entryId)).toEqual(['E', 'F', 'G']);
        expect(start.every((row) => row.points === 0 && row.played === 0)).toBe(true);
    });

    it('uses the tournament points and ignores matches outside the group', () => {
        const table = standings(
            four.slice(0, 2),
            [played('A', 1, 1, 'B'), played('A', 5, 0, 'Q')],
            { win: 2, draw: 1 },
        );
        expect(table.map((row) => [row.entryId, row.points, row.played])).toEqual([
            ['A', 1, 1],
            ['B', 1, 1],
        ]);
    });
});

describe('advancing from groups', () => {
    it('seeds the winners first, then the runners-up, and pairs them across groups', () => {
        const group = (groupNo: number, ids: string[]) => ({
            groupNo,
            rows: standings(
                ids.map((id, index) => ({ id, seed: index + 1 })),
                [],
                { win: 3, draw: 1 },
            ),
        });
        const entrants = qualifiers(
            [group(2, ['B1', 'B2', 'B3']), group(1, ['A1', 'A2', 'A3'])],
            2,
        );
        expect(entrants).toEqual([
            { id: 'A1', group: 1 },
            { id: 'B1', group: 2 },
            { id: 'A2', group: 1 },
            { id: 'B2', group: 2 },
        ]);
        const plan = knockoutPlan(entrants, false);
        expect(sides(at(plan, 1, 0))).toEqual(['A1', 'B2']);
        expect(sides(at(plan, 1, 1))).toEqual(['B1', 'A2']);
    });
});
