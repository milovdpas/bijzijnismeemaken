import { describe, expect, it } from 'vitest';

import { addPlayer } from './players';
import type { ToolPlayer } from './players';
import {
    CATEGORIES,
    MAX_EXTRA_YAHTZEES,
    bonusPace,
    choicesFor,
    emptyYahtzee,
    endYahtzee,
    isFinished,
    isValidScore,
    nextPlayer,
    parseYahtzeeState,
    playerTotals,
    setExtraYahtzees,
    setScore,
    setYahtzeePlayers,
    sheetTotals,
    startYahtzee,
    yahtzeeToSetup,
    yahtzeeWinners,
} from './yahtzee';
import type { YahtzeeCategory, YahtzeeState } from './yahtzee';

function game(...names: string[]): YahtzeeState {
    let players: ToolPlayer[] = [];
    for (const name of names) {
        const result = addPlayer(players, name, null, 8);
        if (!result.ok) throw new Error(result.problem);
        players = result.players;
    }
    return startYahtzee(setYahtzeePlayers(emptyYahtzee, players));
}

/** A full sheet: every box at its first non-zero choice (so a 50 Yahtzee), chance as given. */
function fill(state: YahtzeeState, playerId: string, chance = 20): YahtzeeState {
    return CATEGORIES.reduce((current, category: YahtzeeCategory) => {
        const value = choicesFor(category)?.[1] ?? (category === 'chance' ? chance : 15);
        return setScore(current, playerId, category, value);
    }, state);
}

describe('yahtzee boxes', () => {
    it('offers the scores an upper or fixed box can hold', () => {
        expect(choicesFor('fours')).toEqual([0, 4, 8, 12, 16, 20]);
        expect(choicesFor('fullHouse')).toEqual([0, 25]);
        expect(choicesFor('yahtzee')).toEqual([0, 50]);
        expect(choicesFor('chance')).toBeNull();
    });

    it('takes a dice total of 5 to 30, and nought only where a box can be scratched', () => {
        expect(isValidScore('threeOfAKind', 0)).toBe(true);
        expect(isValidScore('threeOfAKind', 4)).toBe(false);
        expect(isValidScore('fourOfAKind', 30)).toBe(true);
        expect(isValidScore('fourOfAKind', 31)).toBe(false);
        expect(isValidScore('chance', 0)).toBe(false);
        expect(isValidScore('chance', 5)).toBe(true);
        expect(isValidScore('sixes', 7)).toBe(false);
        expect(isValidScore('largeStraight', 30)).toBe(false);
    });
});

describe('yahtzee sheet', () => {
    it('fills, corrects and refuses impossible scores', () => {
        let state = game('Anna', 'Bob');
        state = setScore(state, 'p1', 'sixes', 18);
        expect(state.sheets.p1).toEqual({ sixes: 18 });
        expect(setScore(state, 'p1', 'sixes', 19)).toBe(state);
        expect(setScore(state, 'p9', 'sixes', 18)).toBe(state);
        state = setScore(state, 'p1', 'sixes', null);
        expect(state.sheets.p1).toEqual({});
    });

    it('pays the upper bonus from exactly 63', () => {
        const par = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 };
        expect(sheetTotals(par)).toEqual({
            upper: 63,
            bonus: 35,
            yahtzeeBonus: 0,
            lower: 0,
            total: 98,
            filled: 6,
        });
        expect(sheetTotals({ ...par, ones: 2 }).bonus).toBe(0);
        expect(sheetTotals({ ...par, fullHouse: 25, chance: 22 }).total).toBe(145);
    });

    it('tells how the upper section paces against the bonus', () => {
        expect(bonusPace({})).toBe(0);
        expect(bonusPace({ sixes: 24, ones: 1 })).toBe(6 - 2);
    });

    it('knows whose turn it is by the boxes filled', () => {
        let state = game('Anna', 'Bob');
        expect(nextPlayer(state)?.name).toBe('Anna');
        state = setScore(state, 'p1', 'chance', 20);
        expect(nextPlayer(state)?.name).toBe('Bob');
        state = setScore(state, 'p2', 'chance', 12);
        expect(nextPlayer(state)?.name).toBe('Anna');
    });

    it('finishes by itself when every box is filled, and names the winners', () => {
        let state = fill(game('Anna', 'Bob'), 'p1', 25);
        expect(isFinished(state)).toBe(false);
        expect(yahtzeeWinners(state)).toEqual([]);
        state = fill(state, 'p2', 20);
        expect(isFinished(state)).toBe(true);
        expect(nextPlayer(state)).toBeNull();
        expect(yahtzeeWinners(state).map((player) => player.name)).toEqual(['Anna']);
        const tie = fill(fill(game('Anna', 'Bob'), 'p1'), 'p2');
        expect(yahtzeeWinners(tie)).toHaveLength(2);
    });

    it('can be ended early, when the totals as they stand decide', () => {
        let state = setScore(game('Anna', 'Bob'), 'p1', 'chance', 20);
        state = setScore(state, 'p2', 'chance', 25);
        const ended = endYahtzee(state);
        expect(isFinished(ended)).toBe(true);
        expect(nextPlayer(ended)).toBeNull();
        expect(yahtzeeWinners(ended).map((player) => player.name)).toEqual(['Bob']);
        expect(endYahtzee(ended)).toBe(ended);
        // A finished sheet can still be corrected, and the result follows.
        const corrected = setScore(ended, 'p1', 'yahtzee', 50);
        expect(yahtzeeWinners(corrected).map((player) => player.name)).toEqual(['Anna']);
        // Ended before anybody scored: over, without a winner.
        expect(yahtzeeWinners(endYahtzee(game('Anna')))).toEqual([]);
    });

    it('starts over with the same players, or is cancelled back to choosing them', () => {
        const state = setScore(game('Anna'), 'p1', 'chance', 20);
        expect(startYahtzee(state).sheets).toEqual({ p1: {} });
        expect(startYahtzee(endYahtzee(state)).phase).toBe('playing');
        const setup = yahtzeeToSetup(state);
        expect(setup.phase).toBe('setup');
        expect(setup.sheets).toEqual({});
        expect(setScore(setup, 'p1', 'chance', 20)).toBe(setup);
        expect(startYahtzee(emptyYahtzee)).toBe(emptyYahtzee);
    });
});

describe('yahtzee bonus', () => {
    it('pays 100 per extra Yahtzee, but only after a 50 in the Yahtzee box', () => {
        let state = game('Anna');
        expect(setExtraYahtzees(state, 'p1', 1)).toBe(state);
        state = setScore(state, 'p1', 'yahtzee', 0);
        expect(setExtraYahtzees(state, 'p1', 1)).toBe(state);
        state = setScore(state, 'p1', 'yahtzee', 50);
        state = setExtraYahtzees(state, 'p1', 2);
        expect(playerTotals(state, 'p1')).toMatchObject({ yahtzeeBonus: 200, lower: 250 });
        expect(playerTotals(state, 'p1').total).toBe(250);
    });

    it('refuses an impossible count, and back to none removes the entry', () => {
        let state = setScore(game('Anna'), 'p1', 'yahtzee', 50);
        expect(setExtraYahtzees(state, 'p1', -1)).toBe(state);
        expect(setExtraYahtzees(state, 'p1', MAX_EXTRA_YAHTZEES + 1)).toBe(state);
        state = setExtraYahtzees(state, 'p1', 1);
        expect(setExtraYahtzees(state, 'p1', 0).extraYahtzees).toEqual({});
    });

    it('goes when the Yahtzee box stops holding 50', () => {
        let state = setExtraYahtzees(setScore(game('Anna'), 'p1', 'yahtzee', 50), 'p1', 1);
        expect(setScore(state, 'p1', 'yahtzee', 0).extraYahtzees).toEqual({});
        expect(setScore(state, 'p1', 'yahtzee', null).extraYahtzees).toEqual({});
        state = setScore(state, 'p1', 'chance', 22);
        expect(state.extraYahtzees).toEqual({ p1: 1 });
    });

    it('counts towards the winner and goes with a new game', () => {
        let state = fill(fill(game('Anna', 'Bob'), 'p1'), 'p2');
        state = setExtraYahtzees(state, 'p2', 1);
        expect(yahtzeeWinners(state).map((player) => player.name)).toEqual(['Bob']);
        expect(startYahtzee(state).extraYahtzees).toEqual({});
        expect(yahtzeeToSetup(state).extraYahtzees).toEqual({});
    });
});

describe('yahtzee storage', () => {
    it('reads a stored sheet back, and nothing that does not add up', () => {
        let state = setScore(game('Anna', 'Bob'), 'p1', 'yahtzee', 50);
        state = setExtraYahtzees(state, 'p1', 1);
        expect(parseYahtzeeState(JSON.parse(JSON.stringify(state)))).toEqual(state);
        expect(parseYahtzeeState({ ...state, sheets: { p1: { fives: 14 }, p2: {} } })).toBeNull();
        expect(parseYahtzeeState({ ...state, sheets: { p1: { bingo: 5 }, p2: {} } })).toBeNull();
        expect(parseYahtzeeState({ ...state, sheets: { p1: {} } })).toBeNull();
        expect(parseYahtzeeState({ ...state, phase: 'done' })).toBeNull();
        // Extra Yahtzees without the 50 they depend on.
        expect(parseYahtzeeState({ ...state, extraYahtzees: { p2: 1 } })).toBeNull();
    });

    it('reads a game stored before the bonus, and settles a full sheet as finished', () => {
        const { extraYahtzees: _dropped, ...older } = setScore(game('Anna'), 'p1', 'chance', 20);
        expect(parseYahtzeeState(older)?.extraYahtzees).toEqual({});
        const full = fill(game('Anna'), 'p1');
        expect(parseYahtzeeState({ ...full, phase: 'playing' })?.phase).toBe('finished');
    });
});
