import { describe, expect, it } from 'vitest';

import { addPlayer } from './players';
import type { ToolPlayer } from './players';
import {
    AMOUNT_MAX,
    addEntry,
    correctEntry,
    emptyScore,
    historyLines,
    leaders,
    endScore,
    restartScore,
    scoreWinners,
    parseAmount,
    parseScoreState,
    removeEntry,
    setScorePlayers,
    totals,
} from './score';
import type { ScoreState } from './score';

function withPlayers(...list: string[]): ScoreState {
    let players: ToolPlayer[] = [];
    for (const name of list) {
        const result = addPlayer(players, name, null, 24);
        if (!result.ok) throw new Error(result.problem);
        players = result.players;
    }
    return setScorePlayers(emptyScore, players);
}

describe('score tracker', () => {
    it('adds up the entries per player', () => {
        let state = withPlayers('Anna', 'Bob');
        state = addEntry(state, 'p1', 25, 1);
        state = addEntry(state, 'p2', 10, 2);
        state = addEntry(state, 'p1', -5, 3);
        expect(totals(state)).toEqual({ p1: 20, p2: 10 });
        expect(state.entries.map((entry) => entry.id)).toEqual(['e1', 'e2', 'e3']);
    });

    it('ignores an entry that is zero, fractional, too big or for nobody', () => {
        const state = withPlayers('Anna');
        expect(addEntry(state, 'p1', 0, 1)).toBe(state);
        expect(addEntry(state, 'p1', 1.5, 1)).toBe(state);
        expect(addEntry(state, 'p1', AMOUNT_MAX + 1, 1)).toBe(state);
        expect(addEntry(state, 'p9', 5, 1)).toBe(state);
    });

    it('names the leaders, ties included, once anybody scored', () => {
        let state = withPlayers('Anna', 'Bob', 'Cas');
        expect(leaders(state)).toEqual([]);
        state = addEntry(state, 'p1', 5, 1);
        state = addEntry(state, 'p3', 5, 2);
        expect(leaders(state)).toEqual(['p1', 'p3']);
        // Everybody below zero: the least negative leads.
        state = addEntry(addEntry(state, 'p1', -10, 3), 'p3', -10, 4);
        state = addEntry(state, 'p2', -1, 5);
        expect(leaders(state)).toEqual(['p2']);
    });

    it('lists the history newest first with running totals', () => {
        let state = withPlayers('Anna', 'Bob');
        state = addEntry(state, 'p1', 10, 1);
        state = addEntry(state, 'p2', 3, 2);
        state = addEntry(state, 'p1', 7, 3);
        expect(historyLines(state).map((line) => [line.entry.id, line.total])).toEqual([
            ['e3', 17],
            ['e2', 3],
            ['e1', 10],
        ]);
    });

    it('corrects and removes an entry, and the totals follow', () => {
        let state = withPlayers('Anna');
        state = addEntry(addEntry(state, 'p1', 10, 1), 'p1', 4, 2);
        state = correctEntry(state, 'e1', -2);
        expect(totals(state)).toEqual({ p1: 2 });
        expect(correctEntry(state, 'e1', 0)).toBe(state);
        state = removeEntry(state, 'e2');
        expect(totals(state)).toEqual({ p1: -2 });
    });

    it('starts over with the same players, and drops entries of a player who left', () => {
        let state = withPlayers('Anna', 'Bob');
        state = addEntry(addEntry(state, 'p1', 10, 1), 'p2', 5, 2);
        expect(restartScore(state)).toEqual({ ...state, entries: [] });
        const [anna] = state.players;
        if (anna === undefined) throw new Error('no players');
        const left = setScorePlayers(state, [anna]);
        expect(left.entries.map((entry) => entry.playerId)).toEqual(['p1']);
    });

    it('ends with the totals as the result, and takes nothing more', () => {
        let state = withPlayers('Anna', 'Bob', 'Cas');
        expect(endScore(state)).toBe(state);
        state = addEntry(addEntry(state, 'p1', 10, 1), 'p3', 10, 2);
        expect(scoreWinners(state)).toEqual([]);
        const ended = endScore(state);
        expect(ended.finished).toBe(true);
        expect(scoreWinners(ended).map((player) => player.name)).toEqual(['Anna', 'Cas']);
        expect(addEntry(ended, 'p2', 5, 3)).toBe(ended);
        expect(correctEntry(ended, 'e1', 4)).toBe(ended);
        expect(removeEntry(ended, 'e1')).toBe(ended);
        const again = restartScore(ended);
        expect(again.finished).toBe(false);
        expect(again.entries).toEqual([]);
        expect(again.players).toEqual(ended.players);
    });

    it('reads the amount field: digits only, never zero', () => {
        expect(parseAmount('')).toBeNull();
        expect(parseAmount(' 25 ')).toBe(25);
        expect(parseAmount('0')).toBeUndefined();
        expect(parseAmount('-3')).toBeUndefined();
        expect(parseAmount('2.5')).toBeUndefined();
        expect(parseAmount('123456')).toBeUndefined();
    });

    it('reads a stored game back, and nothing broken', () => {
        const state = addEntry(withPlayers('Anna'), 'p1', 3, 100);
        expect(parseScoreState(JSON.parse(JSON.stringify(state)))).toEqual(state);
        expect(parseScoreState({ ...state, v: 2 })).toBeNull();
        expect(
            parseScoreState({
                ...state,
                entries: [{ id: 'e1', playerId: 'p9', amount: 3, at: 1 }],
            }),
        ).toBeNull();
        expect(
            parseScoreState({
                ...state,
                entries: [{ id: 'e1', playerId: 'p1', amount: 0, at: 1 }],
            }),
        ).toBeNull();
        expect(parseScoreState(null)).toBeNull();
        // Stored before a game could be ended: still playing.
        const { finished: _dropped, ...older } = state;
        expect(parseScoreState(older)?.finished).toBe(false);
        expect(parseScoreState({ ...state, finished: 'yes' })).toBeNull();
    });
});
