import { isIntegerIn, isRecord } from './guards';
import { nextId, parsePlayers } from './players';
import type { ToolPlayer } from './players';

/**
 * The score tracker (task 44): points per player for any game, as a list of
 * entries. Totals are always the sum of the entries, so correcting one is
 * just changing it, and the history shows where every point came from.
 * No target score and no rounds: a game ends when the table says so, and
 * then the totals stand and nothing more can be entered.
 */

export const SCORE_MAX_PLAYERS = 24;
export const AMOUNT_MAX = 99_999;

export interface ScoreEntry {
    id: string;
    playerId: string;
    /** Positive or negative, never zero. */
    amount: number;
    /** When it was entered, epoch milliseconds; only ever shown. */
    at: number;
}

export interface ScoreState {
    v: 1;
    players: ToolPlayer[];
    entries: ScoreEntry[];
    /** Ended by the players: the totals are the result. */
    finished: boolean;
}

export const emptyScore: ScoreState = { v: 1, players: [], entries: [], finished: false };

function isAmount(amount: unknown): amount is number {
    return isIntegerIn(amount, -AMOUNT_MAX, AMOUNT_MAX) && amount !== 0;
}

/** A new list of players; whoever is gone takes their entries along. */
export function setScorePlayers(state: ScoreState, players: ToolPlayer[]): ScoreState {
    const ids = new Set(players.map((player) => player.id));
    return {
        ...state,
        players,
        entries: state.entries.filter((entry) => ids.has(entry.playerId)),
    };
}

export function addEntry(
    state: ScoreState,
    playerId: string,
    amount: number,
    at: number,
): ScoreState {
    if (state.finished || !isAmount(amount)) return state;
    if (!state.players.some((player) => player.id === playerId)) return state;
    const id = nextId(
        'e',
        state.entries.map((entry) => entry.id),
    );
    return { ...state, entries: [...state.entries, { id, playerId, amount, at }] };
}

/** A different amount for an earlier entry; its moment and player stay. */
export function correctEntry(state: ScoreState, entryId: string, amount: number): ScoreState {
    if (state.finished || !isAmount(amount)) return state;
    return {
        ...state,
        entries: state.entries.map((entry) =>
            entry.id === entryId ? { ...entry, amount } : entry,
        ),
    };
}

export function removeEntry(state: ScoreState, entryId: string): ScoreState {
    if (state.finished) return state;
    return { ...state, entries: state.entries.filter((entry) => entry.id !== entryId) };
}

/** Everybody back to zero and playing again; the players stay. Also how a game is cancelled. */
export function restartScore(state: ScoreState): ScoreState {
    return { ...state, entries: [], finished: false };
}

/** Ends the game: the totals as they stand are the result. Nothing to end before anybody scored. */
export function endScore(state: ScoreState): ScoreState {
    return state.entries.length === 0 ? state : { ...state, finished: true };
}

export function totals(state: ScoreState): Record<string, number> {
    const sums: Record<string, number> = {};
    for (const player of state.players) sums[player.id] = 0;
    for (const entry of state.entries) {
        sums[entry.playerId] = (sums[entry.playerId] ?? 0) + entry.amount;
    }
    return sums;
}

/** Everybody sharing the highest total, once anybody has scored at all. */
export function leaders(state: ScoreState): string[] {
    if (state.entries.length === 0) return [];
    const sums = totals(state);
    const best = Math.max(...state.players.map((player) => sums[player.id] ?? 0));
    return state.players.filter((player) => sums[player.id] === best).map((player) => player.id);
}

/** The winners of an ended game: whoever shares the highest total. */
export function scoreWinners(state: ScoreState): ToolPlayer[] {
    if (!state.finished) return [];
    const ids = new Set(leaders(state));
    return state.players.filter((player) => ids.has(player.id));
}

export interface HistoryLine {
    entry: ScoreEntry;
    /** The player's total right after this entry. */
    total: number;
}

/** Every entry with its player's running total, newest first. */
export function historyLines(state: ScoreState): HistoryLine[] {
    const running: Record<string, number> = {};
    const lines = state.entries.map((entry) => {
        const total = (running[entry.playerId] ?? 0) + entry.amount;
        running[entry.playerId] = total;
        return { entry, total };
    });
    return lines.reverse();
}

/**
 * The amount field: digits only, since the sign comes from the add and
 * subtract buttons (a phone's number pad has no minus). Null when empty,
 * undefined when it is not a whole number from 1 to the maximum.
 */
export function parseAmount(text: string): number | null | undefined {
    const trimmed = text.trim();
    if (trimmed === '') return null;
    if (!/^\d{1,5}$/.test(trimmed)) return undefined;
    const value = Number(trimmed);
    return value === 0 ? undefined : value;
}

export function parseScoreState(raw: unknown): ScoreState | null {
    if (!isRecord(raw) || raw.v !== 1 || !Array.isArray(raw.entries)) return null;
    // Absent in games stored before a game could be ended.
    const finished = raw.finished ?? false;
    if (typeof finished !== 'boolean') return null;
    const players = parsePlayers(raw.players, SCORE_MAX_PLAYERS);
    if (players === null) return null;
    const ids = new Set(players.map((player) => player.id));
    const entries: ScoreEntry[] = [];
    for (const item of raw.entries) {
        if (!isRecord(item)) return null;
        const { id, playerId, amount, at } = item;
        if (typeof id !== 'string' || typeof playerId !== 'string' || !ids.has(playerId)) {
            return null;
        }
        if (!isAmount(amount) || typeof at !== 'number') return null;
        entries.push({ id, playerId, amount, at });
    }
    return { v: 1, players, entries, finished };
}
