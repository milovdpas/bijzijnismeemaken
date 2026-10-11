import { MatchSlot, MatchStage } from '@bzim/types';

/**
 * The knockout bracket (docs/03, tournaments). Entrants in seed order go into
 * a bracket of the next power of two in the standard order: seed 1 meets the
 * last seed and the halves mirror each other, so the strongest meet as late
 * as possible and the byes of an uneven field fall to the top seeds. Pure:
 * the service turns the plan into rows.
 */

export interface KnockoutEntrant {
    id: string;
    /** The group an entrant came out of; the first round keeps a group's entrants apart. */
    group: number | null;
}

/** Where a match sits: its round (1-based) and its position in it (0-based, top to bottom). */
export interface MatchRef {
    round: number;
    position: number;
}

export interface NextRef extends MatchRef {
    slot: MatchSlot;
}

export interface PlannedMatch extends MatchRef {
    stage: MatchStage;
    groupNo: number | null;
    homeId: string | null;
    awayId: string | null;
    /** Set for a bye: the entrant who goes through without playing. */
    winnerId: string | null;
    /** Where the winner plays next; null for a group match, the final and the third-place match. */
    next: NextRef | null;
}

/** The smallest power of two that holds this many entrants. */
export function bracketSize(count: number): number {
    let size = 1;
    while (size < count) size *= 2;
    return size;
}

/**
 * The seed in each slot of a bracket, top to bottom: for eight,
 * 1 8 4 5 2 7 3 6. Each step doubles the bracket and puts every seed
 * against its mirror, so 1 and 2 can only meet in the final.
 */
export function bracketOrder(size: number): number[] {
    let order = [1];
    while (order.length < size) {
        const doubled = order.length * 2;
        order = order.flatMap((seed) => [seed, doubled + 1 - seed]);
    }
    return order;
}

/** The match a winner goes on to: the one above, home from an even position, away from an odd one. */
export function nextOf(round: number, position: number): NextRef {
    return {
        round: round + 1,
        position: Math.floor(position / 2),
        slot: position % 2 === 0 ? MatchSlot.HOME : MatchSlot.AWAY,
    };
}

/** A third-place match needs two semi-finals that both have a loser: four entrants at least. */
export function hasThirdPlace(entrants: number, wanted: boolean): boolean {
    return wanted && entrants >= 4;
}

/** The side of the third-place match a semi-final's loser takes: home from the first, away from the second. */
export function thirdPlaceSlot(semiPosition: number): MatchSlot {
    return semiPosition === 0 ? MatchSlot.HOME : MatchSlot.AWAY;
}

/**
 * Every knockout match, round by round. Byes are matches with one side
 * empty whose entrant is already through, and already in the next match.
 * The final is the last round's position 0; a third-place match, when
 * there is one, its position 1.
 */
export function knockoutPlan(
    entrants: readonly KnockoutEntrant[],
    thirdPlace: boolean,
): PlannedMatch[] {
    if (entrants.length < 2) throw new Error('A knockout needs two entrants');
    const size = bracketSize(entrants.length);
    const rounds = Math.log2(size);
    const slots = separateGroups(bracketOrder(size).map((seed) => entrants[seed - 1] ?? null));

    const matches: PlannedMatch[] = [];
    for (let round = 1; round <= rounds; round += 1) {
        for (let position = 0; position < size / 2 ** round; position += 1) {
            matches.push({
                stage: MatchStage.KNOCKOUT,
                groupNo: null,
                round,
                position,
                homeId: round === 1 ? (slots[2 * position]?.id ?? null) : null,
                awayId: round === 1 ? (slots[2 * position + 1]?.id ?? null) : null,
                winnerId: null,
                next: round === rounds ? null : nextOf(round, position),
            });
        }
    }

    for (const match of matches) {
        if (match.round !== 1 || match.next === null) continue;
        const alone =
            match.homeId === null ? match.awayId : match.awayId === null ? match.homeId : null;
        if (alone === null) continue;
        match.winnerId = alone;
        const { round, position, slot } = match.next;
        const target = matches.find(
            (candidate) => candidate.round === round && candidate.position === position,
        );
        if (target === undefined) continue;
        if (slot === MatchSlot.HOME) target.homeId = alone;
        else target.awayId = alone;
    }

    if (hasThirdPlace(entrants.length, thirdPlace)) {
        matches.push({
            stage: MatchStage.KNOCKOUT,
            groupNo: null,
            round: rounds,
            position: 1,
            homeId: null,
            awayId: null,
            winnerId: null,
            next: null,
        });
    }
    return matches;
}

/**
 * Two entrants of one group should not meet straight away. Where a first
 * round pair comes from one group, its lower seed swaps with the lower seed
 * of the nearest pair for which that leaves neither pair in a clash. Byes
 * never move, so they stay with the top seeds.
 */
function separateGroups(slots: (KnockoutEntrant | null)[]): (KnockoutEntrant | null)[] {
    const result = [...slots];
    const pairs = result.length / 2;
    const clash = (a: KnockoutEntrant | null | undefined, b: KnockoutEntrant | null | undefined) =>
        a !== null &&
        a !== undefined &&
        b !== null &&
        b !== undefined &&
        a.group !== null &&
        a.group === b.group;

    for (let pair = 0; pair < pairs; pair += 1) {
        if (!clash(result[2 * pair], result[2 * pair + 1])) continue;
        const others = Array.from({ length: pairs }, (_, index) => index)
            .filter((other) => other !== pair)
            .sort((a, b) => Math.abs(a - pair) - Math.abs(b - pair));
        for (const other of others) {
            const mine = result[2 * pair + 1] ?? null;
            const theirs = result[2 * other + 1] ?? null;
            if (theirs === null) continue;
            if (clash(result[2 * pair], theirs) || clash(result[2 * other], mine)) continue;
            result[2 * pair + 1] = theirs;
            result[2 * other + 1] = mine;
            break;
        }
    }
    return result;
}
