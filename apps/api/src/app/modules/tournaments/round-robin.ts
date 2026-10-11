import { MatchStage } from '@bzim/types';

import type { PlannedMatch } from './bracket';

/**
 * The group stage (docs/03, tournaments): which group each entry starts in,
 * and every match of a group. Pure, like the bracket.
 */

/**
 * The group of each entry in seed order, dealt snake-wise: with two groups
 * 1 A, 2 B, 3 B, 4 A, so every group gets its share of the strong and the
 * weak. Groups count from 1.
 */
export function snakeGroups(count: number, groupCount: number): number[] {
    return Array.from({ length: count }, (_, index) => {
        const lap = Math.floor(index / groupCount);
        const offset = index % groupCount;
        return (lap % 2 === 0 ? offset : groupCount - 1 - offset) + 1;
    });
}

/**
 * Every pairing in a group once, in rounds, by the circle method: the first
 * entry stays put and the others turn around it, so nobody plays twice in a
 * round; with an odd count each entry sits one round out.
 *
 * Home and away go by the entries' places in the group, not by the round:
 * of the i-th and the j-th entry, the earlier is home when i + j is odd and
 * the later when it is even. That keeps everybody's home and away within one
 * of each other, which no rule tied to the turning circle manages.
 */
export function roundRobinPlan(groupNo: number, entryIds: readonly string[]): PlannedMatch[] {
    const place = new Map(entryIds.map((id, index) => [id, index]));
    const circle: (string | null)[] =
        entryIds.length % 2 === 0 ? [...entryIds] : [...entryIds, null];
    const size = circle.length;
    const matches: PlannedMatch[] = [];

    for (let round = 1; round < size; round += 1) {
        let position = 0;
        for (let index = 0; index < size / 2; index += 1) {
            const first = circle[index] ?? null;
            const second = circle[size - 1 - index] ?? null;
            if (first === null || second === null) continue;
            const [earlier, later] =
                (place.get(first) ?? 0) < (place.get(second) ?? 0)
                    ? [first, second]
                    : [second, first];
            const sum = (place.get(earlier) ?? 0) + (place.get(later) ?? 0);
            matches.push({
                stage: MatchStage.GROUP,
                groupNo,
                round,
                position,
                homeId: sum % 2 === 1 ? earlier : later,
                awayId: sum % 2 === 1 ? later : earlier,
                winnerId: null,
                next: null,
            });
            position += 1;
        }
        const last = circle.pop();
        if (last !== undefined) circle.splice(1, 0, last);
    }
    return matches;
}
