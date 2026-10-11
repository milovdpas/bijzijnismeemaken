import { isIntegerIn, isRecord } from './guards';
import { parsePlayers } from './players';
import type { ToolPlayer } from './players';

/**
 * Darts on one device (task 44): 501 or 301 counted down a turn at a time,
 * with busts and an optional double to finish, or around the clock. A leg
 * is its list of turns, so every number on the board is derived from it
 * and undo is dropping the last one.
 */

export const DARTS_MAX_PLAYERS = 8;

export type DartsMode = 'x01' | 'clock';
export const X01_STARTS = [501, 301] as const;
export type X01Start = (typeof X01_STARTS)[number];

export interface DartsSettings {
    mode: DartsMode;
    start: X01Start;
    /** The last dart of an x01 leg has to be a double (the bull counts). */
    doubleOut: boolean;
    /** Around the clock ends on the bull after 20. */
    clockBull: boolean;
}

/**
 * One visit: the points thrown (x01) or the targets hit (clock). A bust
 * keeps what was thrown, for the history, but counts for nothing.
 */
export interface DartsTurn {
    playerId: string;
    value: number;
    bust: boolean;
}

export interface DartsState {
    v: 1;
    phase: 'setup' | 'playing' | 'finished';
    players: ToolPlayer[];
    settings: DartsSettings;
    /** Who threw first this leg, as an index into `players`; it moves on every leg. */
    starter: number;
    /** This leg's turns, oldest first. */
    turns: DartsTurn[];
    /** The winner of every earlier leg. */
    wins: string[];
}

export const emptyDarts: DartsState = {
    v: 1,
    phase: 'setup',
    players: [],
    settings: { mode: 'x01', start: 501, doubleOut: true, clockBull: false },
    starter: 0,
    turns: [],
    wins: [],
};

/* ---------------------------------------------------------------------------
 * The board
 * ------------------------------------------------------------------------- */

/** One dart's target as players say it: `T20`, `D16`, `20`, `25` (outer bull) or `Bull`. */
export interface Dart {
    label: string;
    value: number;
    double: boolean;
}

const DARTS: readonly Dart[] = [
    ...Array.from({ length: 20 }, (_, index) => index + 1).flatMap((n) => [
        { label: String(n), value: n, double: false },
        { label: `D${String(n)}`, value: 2 * n, double: true },
        { label: `T${String(n)}`, value: 3 * n, double: false },
    ]),
    { label: '25', value: 25, double: false },
    { label: 'Bull', value: 50, double: true },
];

const BY_VALUE = new Map<number, Dart[]>();
for (const dart of DARTS) BY_VALUE.set(dart.value, [...(BY_VALUE.get(dart.value) ?? []), dart]);

const VALUES = [0, ...BY_VALUE.keys()];

/** Every total three darts can make, misses included: 0 to 180 bar the few nobody can throw. */
const POSSIBLE_TURNS: ReadonlySet<number> = new Set(
    VALUES.flatMap((a) => VALUES.flatMap((b) => VALUES.map((c) => a + b + c))),
);

export function isPossibleTurn(value: number): boolean {
    return POSSIBLE_TURNS.has(value);
}

/*
 * Checkout hints. Rather than a typed-in chart, the route is searched: the
 * fewest darts first, then the cheapest by how natural each dart is (big
 * trebles to set up, the doubles players like to finish on), then the
 * bigger dart first. That gives the classic routes for the big numbers
 * (170 T20 T20 Bull, 100 T20 D20) and always a valid one for the rest.
 */
const TREBLE_COST: Readonly<Record<number, number>> = {
    20: 0,
    19: 1,
    18: 1,
    17: 2,
    16: 2,
    15: 3,
    14: 3,
    13: 3,
    12: 3,
    10: 3,
    11: 4,
};

const FINISH_COST: Readonly<Record<string, number>> = {
    D20: 0,
    D16: 0,
    D18: 1,
    D12: 1,
    D10: 1,
    D8: 2,
    D4: 2,
    D14: 3,
    D6: 3,
    D2: 4,
    Bull: 4,
    D1: 6,
};

function setupCost(dart: Dart): number {
    if (dart.label === 'Bull') return 5;
    if (dart.label === '25') return 4;
    if (dart.label.startsWith('T')) return TREBLE_COST[dart.value / 3] ?? 6;
    if (dart.label.startsWith('D')) return 6;
    return 1;
}

function finishCost(dart: Dart, doubleOut: boolean): number {
    // The odd doubles are the awkward ones: a miss leaves an odd number.
    return doubleOut ? (FINISH_COST[dart.label] ?? 5) : setupCost(dart);
}

function finishesFor(value: number, doubleOut: boolean): Dart[] {
    return (BY_VALUE.get(value) ?? []).filter((dart) => !doubleOut || dart.double);
}

function routesOf(remaining: number, doubleOut: boolean, count: number): Dart[][] {
    const routes: Dart[][] = [];
    if (count === 1) {
        for (const finish of finishesFor(remaining, doubleOut)) routes.push([finish]);
    } else if (count === 2) {
        for (const first of DARTS) {
            for (const finish of finishesFor(remaining - first.value, doubleOut)) {
                routes.push([first, finish]);
            }
        }
    } else {
        for (const first of DARTS) {
            for (const second of DARTS) {
                // Order does not change the total; bigger first is how players say it.
                if (second.value > first.value) continue;
                const rest = remaining - first.value - second.value;
                for (const finish of finishesFor(rest, doubleOut)) {
                    routes.push([first, second, finish]);
                }
            }
        }
    }
    return routes;
}

function routeCost(route: Dart[], doubleOut: boolean): number {
    const finish = route[route.length - 1];
    if (finish === undefined) return Infinity;
    return (
        route.slice(0, -1).reduce((sum, dart) => sum + setupCost(dart), 0) +
        finishCost(finish, doubleOut)
    );
}

function compareRoutes(a: Dart[], b: Dart[], doubleOut: boolean): number {
    const cost = routeCost(a, doubleOut) - routeCost(b, doubleOut);
    if (cost !== 0) return cost;
    const lastA = a[a.length - 1];
    const lastB = b[b.length - 1];
    const finish =
        (lastA === undefined ? 0 : finishCost(lastA, doubleOut)) -
        (lastB === undefined ? 0 : finishCost(lastB, doubleOut));
    if (finish !== 0) return finish;
    for (let index = 0; index < a.length; index += 1) {
        const bigger = (b[index]?.value ?? 0) - (a[index]?.value ?? 0);
        if (bigger !== 0) return bigger;
    }
    return 0;
}

/**
 * How to finish from here in at most three darts, or null when it cannot
 * be done (over 170 on a double, or one of the "bogey" numbers like 169).
 */
export function checkout(remaining: number, doubleOut: boolean): Dart[] | null {
    if (!isIntegerIn(remaining, doubleOut ? 2 : 1, doubleOut ? 170 : 180)) return null;
    for (const count of [1, 2, 3]) {
        const routes = routesOf(remaining, doubleOut, count);
        if (routes.length > 0) {
            const best = [...routes].sort((a, b) => compareRoutes(a, b, doubleOut))[0] ?? null;
            // Without a double to finish on, the order is free: biggest first, as it is called.
            return best === null || doubleOut ? best : [...best].sort((a, b) => b.value - a.value);
        }
    }
    return null;
}

/* ---------------------------------------------------------------------------
 * The leg
 * ------------------------------------------------------------------------- */

export function turnsOf(state: DartsState, playerId: string): DartsTurn[] {
    return state.turns.filter((turn) => turn.playerId === playerId);
}

export function x01Remaining(state: DartsState, playerId: string): number {
    return turnsOf(state, playerId).reduce<number>(
        (left, turn) => (turn.bust ? left : left - turn.value),
        state.settings.start,
    );
}

export function clockTargets(settings: DartsSettings): number[] {
    const numbers = Array.from({ length: 20 }, (_, index) => index + 1);
    return settings.clockBull ? [...numbers, 25] : numbers;
}

/** How many targets a player has done, in order. */
export function clockProgress(state: DartsState, playerId: string): number {
    const hits = turnsOf(state, playerId).reduce((sum, turn) => sum + turn.value, 0);
    return Math.min(clockTargets(state.settings).length, hits);
}

/** The number a player aims at next (25 for the bull), or null once done. */
export function clockTarget(state: DartsState, playerId: string): number | null {
    return clockTargets(state.settings)[clockProgress(state, playerId)] ?? null;
}

/** Whoever won this leg with the last turn, or null while it is still on. */
export function legWinner(state: DartsState): ToolPlayer | null {
    const last = state.turns[state.turns.length - 1];
    if (last === undefined || last.bust) return null;
    const player = state.players.find((candidate) => candidate.id === last.playerId);
    if (player === undefined) return null;
    const done =
        state.settings.mode === 'x01'
            ? x01Remaining(state, player.id) === 0
            : clockProgress(state, player.id) >= clockTargets(state.settings).length;
    return done ? player : null;
}

/** Whose turn it is; nobody's in setup or once the leg is won. */
export function currentPlayer(state: DartsState): ToolPlayer | null {
    if (state.phase !== 'playing' || state.players.length === 0) return null;
    if (legWinner(state) !== null) return null;
    return state.players[(state.starter + state.turns.length) % state.players.length] ?? null;
}

/**
 * What an x01 turn total would do: `invalid` (three darts cannot make it,
 * or cannot finish with it), `bust`, `score`, `finish`, or `ask-double`
 * when it ends the leg on a double-out game and only the thrower knows
 * whether the last dart was a double.
 */
export type X01Check = 'invalid' | 'bust' | 'score' | 'finish' | 'ask-double';

export function x01Check(state: DartsState, value: number): X01Check {
    const player = currentPlayer(state);
    if (player === null || state.settings.mode !== 'x01' || !isPossibleTurn(value)) {
        return 'invalid';
    }
    const remaining = x01Remaining(state, player.id);
    const left = remaining - value;
    if (left < 0) return 'bust';
    if (left === 0) {
        if (!state.settings.doubleOut) return 'finish';
        return checkout(remaining, true) === null ? 'invalid' : 'ask-double';
    }
    if (state.settings.doubleOut && left === 1) return 'bust';
    return 'score';
}

/**
 * Records an x01 turn. `onDouble` answers `ask-double`: true finishes the
 * leg, false makes it a bust; while that question is open, nothing changes.
 */
export function x01Throw(state: DartsState, value: number, onDouble: boolean | null): DartsState {
    const player = currentPlayer(state);
    const check = x01Check(state, value);
    if (player === null || check === 'invalid') return state;
    if (check === 'ask-double' && onDouble === null) return state;
    const bust = check === 'bust' || (check === 'ask-double' && onDouble === false);
    return { ...state, turns: [...state.turns, { playerId: player.id, value, bust }] };
}

/** The most targets the current player can still hit this turn. */
export function clockMaxHits(state: DartsState): number {
    const player = currentPlayer(state);
    if (player === null || state.settings.mode !== 'clock') return 0;
    return Math.min(3, clockTargets(state.settings).length - clockProgress(state, player.id));
}

export function clockThrow(state: DartsState, hits: number): DartsState {
    const player = currentPlayer(state);
    if (player === null || !isIntegerIn(hits, 0, clockMaxHits(state))) return state;
    return {
        ...state,
        turns: [...state.turns, { playerId: player.id, value: hits, bust: false }],
    };
}

export function undoTurn(state: DartsState): DartsState {
    return state.turns.length === 0 ? state : { ...state, turns: state.turns.slice(0, -1) };
}

/** Points per turn this leg, busts counting as nothing: the three-dart average players quote. */
export function x01Average(state: DartsState, playerId: string): number | null {
    const turns = turnsOf(state, playerId);
    if (turns.length === 0) return null;
    return turns.reduce((sum, turn) => sum + (turn.bust ? 0 : turn.value), 0) / turns.length;
}

/** The share of darts that hit, this leg. */
export function clockHitRate(state: DartsState, playerId: string): number | null {
    const turns = turnsOf(state, playerId);
    if (turns.length === 0) return null;
    return turns.reduce((sum, turn) => sum + turn.value, 0) / (turns.length * 3);
}

export interface TurnLine {
    turn: DartsTurn;
    /** Where the player stood after it: points left (x01) or targets done (clock). */
    after: number;
}

/** This leg's turns with the standing after each, newest first. */
export function turnLines(state: DartsState): TurnLine[] {
    const x01 = state.settings.mode === 'x01';
    const total = clockTargets(state.settings).length;
    const standing = new Map<string, number>();
    const lines = state.turns.map((turn) => {
        const before = standing.get(turn.playerId) ?? (x01 ? state.settings.start : 0);
        const after = x01
            ? turn.bust
                ? before
                : before - turn.value
            : Math.min(total, before + turn.value);
        standing.set(turn.playerId, after);
        return { turn, after };
    });
    return lines.reverse();
}

export function winsOf(state: DartsState, playerId: string): number {
    return state.wins.filter((id) => id === playerId).length;
}

/* ---------------------------------------------------------------------------
 * Between legs
 * ------------------------------------------------------------------------- */

export function setDartsPlayers(state: DartsState, players: ToolPlayer[]): DartsState {
    return state.phase === 'setup' ? { ...state, players, starter: 0 } : state;
}

export function setDartsSettings(state: DartsState, settings: Partial<DartsSettings>): DartsState {
    return state.phase === 'setup'
        ? { ...state, settings: { ...state.settings, ...settings } }
        : state;
}

export function startGame(state: DartsState): DartsState {
    if (state.players.length === 0) return state;
    return { ...state, phase: 'playing', starter: 0, turns: [], wins: [] };
}

/** The leg's winner is counted and the next player in line throws first. */
export function nextLeg(state: DartsState): DartsState {
    const winner = legWinner(state);
    if (winner === null) return state;
    return {
        ...state,
        wins: [...state.wins, winner.id],
        starter: (state.starter + 1) % state.players.length,
        turns: [],
    };
}

/** Back to choosing players and settings; the scores of this game go. Also how a game is cancelled. */
export function toSetup(state: DartsState): DartsState {
    return { ...state, phase: 'setup', starter: 0, turns: [], wins: [] };
}

/**
 * Ends the game: a leg just won still counts, a leg half thrown does not.
 * The legs won decide.
 */
export function endDarts(state: DartsState): DartsState {
    if (state.phase !== 'playing') return state;
    const counted = legWinner(state) === null ? state : nextLeg(state);
    return { ...counted, phase: 'finished', turns: [] };
}

/** Whoever won the most legs, once the game is over; nobody if no leg was finished. */
export function matchWinners(state: DartsState): ToolPlayer[] {
    if (state.phase !== 'finished' || state.wins.length === 0) return [];
    const most = Math.max(...state.players.map((player) => winsOf(state, player.id)));
    return state.players.filter((player) => winsOf(state, player.id) === most);
}

/* ---------------------------------------------------------------------------
 * Storage
 * ------------------------------------------------------------------------- */

function parseSettings(raw: unknown): DartsSettings | null {
    if (!isRecord(raw)) return null;
    const { mode, start, doubleOut, clockBull } = raw;
    if (mode !== 'x01' && mode !== 'clock') return null;
    if (start !== 501 && start !== 301) return null;
    if (typeof doubleOut !== 'boolean' || typeof clockBull !== 'boolean') return null;
    return { mode, start, doubleOut, clockBull };
}

export function parseDartsState(raw: unknown): DartsState | null {
    if (!isRecord(raw) || raw.v !== 1) return null;
    const players = parsePlayers(raw.players, DARTS_MAX_PLAYERS);
    const settings = parseSettings(raw.settings);
    const { phase, starter, turns, wins } = raw;
    if (players === null || settings === null) return null;
    if (phase !== 'setup' && phase !== 'playing' && phase !== 'finished') return null;
    if (!isIntegerIn(starter, 0, Math.max(0, players.length - 1))) return null;
    if (!Array.isArray(turns) || !Array.isArray(wins)) return null;
    const ids = new Set(players.map((player) => player.id));
    const parsedTurns: DartsTurn[] = [];
    for (const item of turns) {
        if (!isRecord(item)) return null;
        const { playerId, value, bust } = item;
        if (typeof playerId !== 'string' || !ids.has(playerId)) return null;
        if (!isIntegerIn(value, 0, 180) || typeof bust !== 'boolean') return null;
        parsedTurns.push({ playerId, value, bust });
    }
    const parsedWins = wins.filter((id): id is string => typeof id === 'string' && ids.has(id));
    if (parsedWins.length !== wins.length) return null;
    return {
        v: 1,
        phase,
        players,
        settings,
        starter,
        turns: parsedTurns,
        wins: parsedWins,
    };
}
