import { isIntegerIn, isRecord } from './guards';
import { parsePlayers } from './players';
import type { ToolPlayer } from './players';

/**
 * The Yahtzee score sheet (task 44): the thirteen boxes per player, the
 * upper bonus and the totals. The dice stay on the table; this only knows
 * which scores a box can hold, so a typo is caught before it is added up.
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
    phase: 'setup' | 'playing';
    players: ToolPlayer[];
    /** Per player id, the boxes filled so far. */
    sheets: Record<string, YahtzeeSheet>;
}

export const emptyYahtzee: YahtzeeState = { v: 1, phase: 'setup', players: [], sheets: {} };

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
    };
}

/** Back to choosing players; the sheets go. */
export function yahtzeeToSetup(state: YahtzeeState): YahtzeeState {
    return { ...state, phase: 'setup', sheets: {} };
}

/** Fills a box, or empties it again with null to correct a mistake. */
export function setScore(
    state: YahtzeeState,
    playerId: string,
    category: YahtzeeCategory,
    value: number | null,
): YahtzeeState {
    const sheet = state.sheets[playerId];
    if (state.phase !== 'playing' || sheet === undefined) return state;
    if (value !== null && !isValidScore(category, value)) return state;
    const next: YahtzeeSheet = { ...sheet };
    if (value === null) delete next[category];
    else next[category] = value;
    return { ...state, sheets: { ...state.sheets, [playerId]: next } };
}

export interface SheetTotals {
    upper: number;
    bonus: number;
    lower: number;
    total: number;
    filled: number;
}

export function sheetTotals(sheet: YahtzeeSheet): SheetTotals {
    const sum = (categories: readonly YahtzeeCategory[]) =>
        categories.reduce((total, category) => total + (sheet[category] ?? 0), 0);
    const upper = sum(UPPER_CATEGORIES);
    const lower = sum(LOWER_CATEGORIES);
    const bonus = upper >= BONUS_THRESHOLD ? UPPER_BONUS : 0;
    const filled = CATEGORIES.filter((category) => sheet[category] !== undefined).length;
    return { upper, bonus, lower, total: upper + bonus + lower, filled };
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

/** Whose turn it is: the first player with the fewest boxes filled; null once every sheet is full. */
export function nextPlayer(state: YahtzeeState): ToolPlayer | null {
    if (state.phase !== 'playing') return null;
    let next: ToolPlayer | null = null;
    let fewest = CATEGORIES.length;
    for (const player of state.players) {
        const filled = sheetTotals(state.sheets[player.id] ?? {}).filled;
        if (filled < fewest) {
            fewest = filled;
            next = player;
        }
    }
    return next;
}

export function isFinished(state: YahtzeeState): boolean {
    return state.phase === 'playing' && state.players.length > 0 && nextPlayer(state) === null;
}

/** Everybody with the highest total, once every box is filled. */
export function yahtzeeWinners(state: YahtzeeState): ToolPlayer[] {
    if (!isFinished(state)) return [];
    const totalOf = (player: ToolPlayer) => sheetTotals(state.sheets[player.id] ?? {}).total;
    const best = Math.max(...state.players.map(totalOf));
    return state.players.filter((player) => totalOf(player) === best);
}

export function parseYahtzeeState(raw: unknown): YahtzeeState | null {
    if (!isRecord(raw) || raw.v !== 1 || !isRecord(raw.sheets)) return null;
    const { phase } = raw;
    if (phase !== 'setup' && phase !== 'playing') return null;
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
    if (phase === 'playing' && players.some((player) => sheets[player.id] === undefined)) {
        return null;
    }
    return { v: 1, phase, players, sheets };
}
