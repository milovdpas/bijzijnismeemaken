import type { KnockoutEntrant } from './bracket';

/**
 * Group tables (docs/03, tournaments): what every entry played, won and
 * scored, the order (points, then score difference, then scored, then the
 * matches among those still level, then seed) and who goes through to the
 * knockout. Pure; only played matches are passed in.
 */

export interface PlayedMatch {
    homeId: string;
    awayId: string;
    homeScore: number;
    awayScore: number;
}

export interface PointsRule {
    win: number;
    draw: number;
}

export interface StandingRow {
    entryId: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    scored: number;
    conceded: number;
    difference: number;
    points: number;
    /** 1-based. Ties are broken down to the seed, so no two entries share a place. */
    rank: number;
}

type Tally = Omit<StandingRow, 'rank'>;

function blank(entryId: string): Tally {
    return {
        entryId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        scored: 0,
        conceded: 0,
        difference: 0,
        points: 0,
    };
}

/** The table of these entries from these matches; matches with anybody else are left out. */
function tally(
    entryIds: readonly string[],
    matches: readonly PlayedMatch[],
    points: PointsRule,
): Map<string, Tally> {
    const rows = new Map(entryIds.map((id) => [id, blank(id)]));
    for (const match of matches) {
        const home = rows.get(match.homeId);
        const away = rows.get(match.awayId);
        if (home === undefined || away === undefined) continue;
        for (const [row, scored, conceded] of [
            [home, match.homeScore, match.awayScore],
            [away, match.awayScore, match.homeScore],
        ] as const) {
            row.played += 1;
            row.scored += scored;
            row.conceded += conceded;
            row.difference = row.scored - row.conceded;
            if (scored > conceded) {
                row.won += 1;
                row.points += points.win;
            } else if (scored === conceded) {
                row.drawn += 1;
                row.points += points.draw;
            } else {
                row.lost += 1;
            }
        }
    }
    return rows;
}

/** Higher first on points, then difference, then scored; 0 when all three are level. */
function byRecord(a: Tally, b: Tally): number {
    return b.points - a.points || b.difference - a.difference || b.scored - a.scored;
}

export function standings(
    entries: readonly { id: string; seed: number }[],
    matches: readonly PlayedMatch[],
    points: PointsRule,
): StandingRow[] {
    const seedOf = new Map(entries.map((entry) => [entry.id, entry.seed]));
    const seed = (row: Tally) => seedOf.get(row.entryId) ?? Number.MAX_SAFE_INTEGER;
    const overall = [
        ...tally(
            entries.map((entry) => entry.id),
            matches,
            points,
        ).values(),
    ].sort(byRecord);

    // Every run still level after points, difference and scored is settled by
    // the matches among just those entries, and then by seed.
    const ordered: Tally[] = [];
    for (let start = 0; start < overall.length;) {
        const first = overall[start];
        if (first === undefined) break;
        let end = start + 1;
        while (end < overall.length) {
            const next = overall[end];
            if (next === undefined || byRecord(first, next) !== 0) break;
            end += 1;
        }
        const level = overall.slice(start, end);
        if (level.length > 1) {
            const among = tally(
                level.map((row) => row.entryId),
                matches,
                points,
            );
            const record = (row: Tally) => among.get(row.entryId) ?? blank(row.entryId);
            level.sort((a, b) => byRecord(record(a), record(b)) || seed(a) - seed(b));
        }
        ordered.push(...level);
        start = end;
    }
    return ordered.map((row, index) => ({ ...row, rank: index + 1 }));
}

/**
 * The knockout entrants out of the groups, in seed order: every group's
 * winner first (group 1, 2, ...), then every runner-up, and so on. The
 * bracket then puts winners against runners-up, and keeps a group's
 * entrants apart in the first round.
 */
export function qualifiers(
    groups: readonly { groupNo: number; rows: readonly StandingRow[] }[],
    advance: number,
): KnockoutEntrant[] {
    const sorted = [...groups].sort((a, b) => a.groupNo - b.groupNo);
    const entrants: KnockoutEntrant[] = [];
    for (let rank = 1; rank <= advance; rank += 1) {
        for (const group of sorted) {
            const row = group.rows.find((candidate) => candidate.rank === rank);
            if (row !== undefined) entrants.push({ id: row.entryId, group: group.groupNo });
        }
    }
    return entrants;
}
