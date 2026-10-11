import { isIntegerIn, isRecord } from './guards';
import { parsePlayers } from './players';
import type { ToolPlayer } from './players';

/**
 * The Yahtzee score sheet (task 44): the thirteen boxes per player, the
 * upper bonus, the Yahtzee bonus and the totals. The dice stay on the table;
 * this only knows which scores a box can hold, so a typo is caught before it
 * is added up. A game finishes when every box is filled, or earlier when the
 * players end it; the totals as they stand then decide.
 */

export const YAHTZEE_MAX_PLAYERS = 8;

export const UPPER_CATEGORIES = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'] as const;
export const LOWER_CATEGORIES = [
    'threeOfAKind',
    'fourOfAKind',
    'fullHouse',
    'smallStraight',
    'largeStraight',
    'yahtzee',
    'chance',
] as const;

export type UpperCategory = (typeof UPPER_CATEGORIES)[number];
export type YahtzeeCategory = UpperCategory | (typeof LOWER_CATEGORIES)[number];

export const CATEGORIES: readonly YahtzeeCategory[] = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES];

/** Three of each face in the upper section adds up to exactly this. */
export const BONUS_THRESHOLD = 63;
export const UPPER_BONUS = 35;
/** Every Yahtzee thrown after a 50 in the Yahtzee box. */
export const YAHTZEE_BONUS = 100;
/** Thirteen turns, one of them for the first Yahtzee. */
export const MAX_EXTRA_YAHTZEES = 12;

const FACE: Readonly<Record<UpperCategory, number>> = {
    ones: 1,
    twos: 2,
    threes: 3,
    fours: 4,
    fives: 5,
    sixes: 6,
};

const FIXED: Readonly<Partial<Record<YahtzeeCategory, number>>> = {
    fullHouse: 25,
    smallStraight: 30,
    largeStraight: 40,
    yahtzee: 50,
};

export type YahtzeeSheet = Partial<Record<YahtzeeCategory, number>>;

export interface YahtzeeState {
    v: 1;
    phase: 'setup' | 'playing' | 'finished';
    players: ToolPlayer[];
    /** Per player id, the boxes filled so far. */
    sheets: Record<string, YahtzeeSheet>;
    /**
     * Per player id, the Yahtzees thrown after a 50 in the Yahtzee box, 100
     * each. Only players with some are listed. An extra Yahtzee also fills a
     * box under the joker rule; the boxes already accept those scores.
     */
    extraYahtzees: Record<string, number>;
}

export const emptyYahtzee: YahtzeeState = {
    v: 1,
    phase: 'setup',
    players: [],
    sheets: {},
    extraYahtzees: {},
};

function isUpper(category: YahtzeeCategory): category is UpperCategory {
    return (UPPER_CATEGORIES as readonly string[]).includes(category);
}

function isCategory(value: string): value is YahtzeeCategory {
    return (CATEGORIES as readonly string[]).includes(value);
}

/**
 * The scores a box can hold when there are only a few: an upper box takes
 * nought to five of its face, a fixed box its points or nought. Null for
 * the boxes that add up all five dice, which take a typed number.
 */
export function choicesFor(category: YahtzeeCategory): number[] | null {
    if (isUpper(category)) return [0, 1, 2, 3, 4, 5].map((count) => count * FACE[category]);
    const fixed = FIXED[category];
    return fixed === undefined ? null : [0, fixed];
}

/**
 * Whether a box can hold this score. Five dice add up to 5 to 30, and every
 * one of those totals can be a three or four of a kind; those two may also
 * be scratched for nought, chance never needs to be.
 */
export function isValidScore(category: YahtzeeCategory, value: number): boolean {
    const choices = choicesFor(category);
    if (choices !== null) return choices.includes(value);
    return isIntegerIn(value, 5, 30) || (value === 0 && category !== 'chance');
}

/** The bonus is only earned on top of a 50 in the Yahtzee box; a scratched box earns none. */
export function earnsYahtzeeBonus(sheet: YahtzeeSheet): boolean {
    return sheet.yahtzee === 50;
}

function withCount(
    counts: Record<string, number>,
    playerId: string,
    count: number,
): Record<string, number> {
    const next = { ...counts };
    if (count === 0) delete next[playerId];
    else next[playerId] = count;
    return next;
}

function filledCount(sheet: YahtzeeSheet): number {
    return CATEGORIES.filter((category) => sheet[category] !== undefined).length;
}

/** A game whose every box is filled is over, whether or not anybody said so. */
function settle(state: YahtzeeState): YahtzeeState {
    const full =
        state.players.length > 0 &&
        state.players.every(
            (player) => filledCount(state.sheets[player.id] ?? {}) === CATEGORIES.length,
        );
    return state.phase === 'playing' && full ? { ...state, phase: 'finished' } : state;
}

export function setYahtzeePlayers(state: YahtzeeState, players: ToolPlayer[]): YahtzeeState {
    return state.phase === 'setup' ? { ...state, players } : state;
}

/** Empty sheets for everybody; also how a new game with the same players starts. */
export function startYahtzee(state: YahtzeeState): YahtzeeState {
    if (state.players.length === 0) return state;
    return {
        ...state,
        phase: 'playing',
        sheets: Object.fromEntries(state.players.map((player) => [player.id, {}])),
        extraYahtzees: {},
    };
}

/** Back to choosing players; the sheets go. Also how a game is cancelled. */
export function yahtzeeToSetup(state: YahtzeeState): YahtzeeState {
    return { ...state, phase: 'setup', sheets: {}, extraYahtzees: {} };
}

/** Ends the game now: the totals as they stand decide. */
export function endYahtzee(state: YahtzeeState): YahtzeeState {
    return state.phase === 'playing' ? { ...state, phase: 'finished' } : state;
}

/**
 * Fills a box, or empties it again with null to correct a mistake; a
 * finished game can still be corrected. A Yahtzee box that no longer holds
 * 50 takes the extra Yahtzees with it.
 */
export function setScore(
    state: YahtzeeState,
    playerId: string,
    category: YahtzeeCategory,
    value: number | null,
): YahtzeeState {
    const sheet = state.sheets[playerId];
    if (state.phase === 'setup' || sheet === undefined) return state;
    if (value !== null && !isValidScore(category, value)) return state;
    const next: YahtzeeSheet = { ...sheet };
    if (value === null) delete next[category];
    else next[category] = value;
    return settle({
        ...state,
        sheets: { ...state.sheets, [playerId]: next },
        extraYahtzees: earnsYahtzeeBonus(next)
            ? state.extraYahtzees
            : withCount(state.extraYahtzees, playerId, 0),
    });
}

/** How many extra Yahtzees a player threw; refused while their Yahtzee box holds no 50. */
export function setExtraYahtzees(
    state: YahtzeeState,
    playerId: string,
    count: number,
): YahtzeeState {
    const sheet = state.sheets[playerId];
    if (state.phase === 'setup' || sheet === undefined) return state;
    if (!isIntegerIn(count, 0, MAX_EXTRA_YAHTZEES)) return state;
    if (count > 0 && !earnsYahtzeeBonus(sheet)) return state;
    return { ...state, extraYahtzees: withCount(state.extraYahtzees, playerId, count) };
}

export interface SheetTotals {
    upper: number;
    /** The upper bonus: 35 from 63. */
    bonus: number;
    /** 100 per extra Yahtzee; part of `lower`, as on the printed sheet. */
    yahtzeeBonus: number;
    lower: number;
    total: number;
    filled: number;
}

export function sheetTotals(sheet: YahtzeeSheet, extraYahtzees = 0): SheetTotals {
    const sum = (categories: readonly YahtzeeCategory[]) =>
        categories.reduce((total, category) => total + (sheet[category] ?? 0), 0);
    const upper = sum(UPPER_CATEGORIES);
    const bonus = upper >= BONUS_THRESHOLD ? UPPER_BONUS : 0;
    const yahtzeeBonus = earnsYahtzeeBonus(sheet) ? extraYahtzees * YAHTZEE_BONUS : 0;
    const lower = sum(LOWER_CATEGORIES) + yahtzeeBonus;
    return {
        upper,
        bonus,
        yahtzeeBonus,
        lower,
        total: upper + bonus + lower,
        filled: filledCount(sheet),
    };
}

/** One player's totals in a game, the extra Yahtzees included. */
export function playerTotals(state: YahtzeeState, playerId: string): SheetTotals {
    return sheetTotals(state.sheets[playerId] ?? {}, state.extraYahtzees[playerId] ?? 0);
}

/**
 * How the upper section stands against the bonus: points above or below
 * three of each face, counting the boxes filled so far. Zero or more means
 * the bonus is on course.
 */
export function bonusPace(sheet: YahtzeeSheet): number {
    return UPPER_CATEGORIES.reduce((pace, category) => {
        const score = sheet[category];
        return score === undefined ? pace : pace + score - 3 * FACE[category];
    }, 0);
}

/** Whose turn it is: the first player with the fewest boxes filled; nobody's once it is over. */
export function nextPlayer(state: YahtzeeState): ToolPlayer | null {
    if (state.phase !== 'playing') return null;
    let next: ToolPlayer | null = null;
    let fewest = CATEGORIES.length;
    for (const player of state.players) {
        const filled = filledCount(state.sheets[player.id] ?? {});
        if (filled < fewest) {
            fewest = filled;
            next = player;
        }
    }
    return next;
}

export function isFinished(state: YahtzeeState): boolean {
    return state.phase === 'finished';
}

/** Everybody with the highest total once the game is over; nobody when nothing was scored. */
export function yahtzeeWinners(state: YahtzeeState): ToolPlayer[] {
    if (!isFinished(state)) return [];
    const totals = new Map(
        state.players.map((player) => [player.id, playerTotals(state, player.id)]),
    );
    if ([...totals.values()].every((entry) => entry.filled === 0)) return [];
    const best = Math.max(...[...totals.values()].map((entry) => entry.total));
    return state.players.filter((player) => totals.get(player.id)?.total === best);
}

export function parseYahtzeeState(raw: unknown): YahtzeeState | null {
    if (!isRecord(raw) || raw.v !== 1 || !isRecord(raw.sheets)) return null;
    const { phase } = raw;
    if (phase !== 'setup' && phase !== 'playing' && phase !== 'finished') return null;
    const players = parsePlayers(raw.players, YAHTZEE_MAX_PLAYERS);
    if (players === null) return null;
    const ids = new Set(players.map((player) => player.id));
    const sheets: Record<string, YahtzeeSheet> = {};
    for (const [playerId, rawSheet] of Object.entries(raw.sheets)) {
        if (!ids.has(playerId) || !isRecord(rawSheet)) return null;
        const sheet: YahtzeeSheet = {};
        for (const [category, value] of Object.entries(rawSheet)) {
            if (!isCategory(category) || typeof value !== 'number') return null;
            if (!isValidScore(category, value)) return null;
            sheet[category] = value;
        }
        sheets[playerId] = sheet;
    }
    if (phase !== 'setup' && players.some((player) => sheets[player.id] === undefined)) {
        return null;
    }
    // Absent in games stored before the Yahtzee bonus existed.
    const rawExtras = raw.extraYahtzees ?? {};
    if (!isRecord(rawExtras)) return null;
    const extraYahtzees: Record<string, number> = {};
    for (const [playerId, count] of Object.entries(rawExtras)) {
        const sheet = sheets[playerId];
        if (sheet === undefined || !earnsYahtzeeBonus(sheet)) return null;
        if (!isIntegerIn(count, 1, MAX_EXTRA_YAHTZEES)) return null;
        extraYahtzees[playerId] = count;
    }
    return settle({ v: 1, phase, players, sheets, extraYahtzees });
}
