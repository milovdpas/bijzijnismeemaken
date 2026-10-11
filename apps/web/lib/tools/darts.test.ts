import { describe, expect, it } from 'vitest';

import {
    checkout,
    clockHitRate,
    clockMaxHits,
    clockProgress,
    clockTarget,
    clockThrow,
    currentPlayer,
    emptyDarts,
    isPossibleTurn,
    legWinner,
    nextLeg,
    parseDartsState,
    setDartsPlayers,
    setDartsSettings,
    startGame,
    toSetup,
    turnLines,
    undoTurn,
    winsOf,
    x01Average,
    x01Check,
    x01Remaining,
    x01Throw,
} from './darts';
import type { DartsSettings, DartsState } from './darts';
import { addPlayer } from './players';
import type { ToolPlayer } from './players';

const BOGEYS = [159, 162, 163, 165, 166, 168, 169];

function labels(remaining: number, doubleOut = true): string[] | null {
    return checkout(remaining, doubleOut)?.map((dart) => dart.label) ?? null;
}

function game(settings: Partial<DartsSettings> = {}, names = ['Anna', 'Bob']): DartsState {
    let players: ToolPlayer[] = [];
    for (const name of names) {
        const result = addPlayer(players, name, null, 8);
        if (!result.ok) throw new Error(result.problem);
        players = result.players;
    }
    return startGame(setDartsSettings(setDartsPlayers(emptyDarts, players), settings));
}

/** Throws these totals in turn order, answering yes to a double-out question. */
function play(state: DartsState, ...values: number[]): DartsState {
    return values.reduce((current, value) => x01Throw(current, value, true), state);
}

describe('three darts', () => {
    it('can throw 0 to 180 except the handful nobody can', () => {
        expect(isPossibleTurn(0)).toBe(true);
        expect(isPossibleTurn(180)).toBe(true);
        expect(isPossibleTurn(177)).toBe(true);
        for (const value of [163, 166, 169, 172, 173, 175, 176, 178, 179, 181]) {
            expect(isPossibleTurn(value)).toBe(false);
        }
    });
});

describe('checkout hints', () => {
    it('suggests the classic routes', () => {
        expect(labels(170)).toEqual(['T20', 'T20', 'Bull']);
        expect(labels(160)).toEqual(['T20', 'T20', 'D20']);
        expect(labels(141)).toEqual(['T20', 'T19', 'D12']);
        expect(labels(100)).toEqual(['T20', 'D20']);
        expect(labels(61)).toEqual(['25', 'D18']);
        expect(labels(64)).toEqual(['T16', 'D8']);
        expect(labels(50)).toEqual(['Bull']);
        expect(labels(41)).toEqual(['9', 'D16']);
        expect(labels(40)).toEqual(['D20']);
        expect(labels(3)).toEqual(['1', 'D1']);
        expect(labels(2)).toEqual(['D1']);
    });

    it('has a valid finish on a double for every number that has one', () => {
        for (let remaining = 2; remaining <= 170; remaining += 1) {
            const route = checkout(remaining, true);
            if (BOGEYS.includes(remaining)) {
                expect(route).toBeNull();
                continue;
            }
            if (route === null) throw new Error(`no route for ${String(remaining)}`);
            expect(route.length).toBeLessThanOrEqual(3);
            expect(route.reduce((sum, dart) => sum + dart.value, 0)).toBe(remaining);
            expect(route[route.length - 1]?.double).toBe(true);
        }
        expect(checkout(1, true)).toBeNull();
        expect(checkout(171, true)).toBeNull();
    });

    it('finishes on anything without double out, biggest dart first', () => {
        expect(labels(180, false)).toEqual(['T20', 'T20', 'T20']);
        expect(labels(100, false)).toEqual(['T20', 'D20']);
        expect(labels(1, false)).toEqual(['1']);
        expect(checkout(181, false)).toBeNull();
        for (let remaining = 1; remaining <= 180; remaining += 1) {
            const route = checkout(remaining, false);
            expect(route !== null).toBe(isPossibleTurn(remaining));
            if (route !== null) {
                expect(route.reduce((sum, dart) => sum + dart.value, 0)).toBe(remaining);
            }
        }
    });
});

describe('x01', () => {
    it('counts down in turn order', () => {
        let state = game();
        expect(currentPlayer(state)?.name).toBe('Anna');
        state = play(state, 60);
        expect(x01Remaining(state, 'p1')).toBe(441);
        expect(currentPlayer(state)?.name).toBe('Bob');
        state = play(state, 45, 100);
        expect(x01Remaining(state, 'p1')).toBe(341);
        expect(x01Remaining(state, 'p2')).toBe(456);
        expect(x01Average(state, 'p1')).toBe(80);
        expect(x01Average(state, 'p2')).toBe(45);
    });

    it('refuses a total three darts cannot make, and changes nothing', () => {
        const state = game();
        expect(x01Check(state, 179)).toBe('invalid');
        expect(x01Throw(state, 179, null)).toBe(state);
        expect(x01Throw(state, -1, null)).toBe(state);
    });

    it('busts on too much, and on one left with double out', () => {
        // Anna down to 41 (Bob throws nothing in between).
        let state = play(game(), 180, 0, 180, 0, 100, 0);
        expect(x01Remaining(state, 'p1')).toBe(41);
        expect(x01Check(state, 45)).toBe('bust');
        expect(x01Check(state, 40)).toBe('bust');
        state = play(state, 45);
        expect(x01Remaining(state, 'p1')).toBe(41);
        expect(state.turns[state.turns.length - 1]).toEqual({
            playerId: 'p1',
            value: 45,
            bust: true,
        });
        expect(currentPlayer(state)?.name).toBe('Bob');
        // Without double out, one left is just one left.
        const open = play(game({ doubleOut: false }), 180, 0, 180, 0, 100, 0);
        expect(x01Check(open, 40)).toBe('score');
    });

    it('asks whether the finish was a double, and only a yes wins', () => {
        const state = play(game(), 180, 0, 180, 0);
        expect(x01Remaining(state, 'p1')).toBe(141);
        expect(x01Check(state, 141)).toBe('ask-double');
        expect(x01Throw(state, 141, null)).toBe(state);

        const missed = x01Throw(state, 141, false);
        expect(legWinner(missed)).toBeNull();
        expect(x01Remaining(missed, 'p1')).toBe(141);

        const won = x01Throw(state, 141, true);
        expect(legWinner(won)?.name).toBe('Anna');
        expect(currentPlayer(won)).toBeNull();
        expect(x01Throw(won, 60, null)).toBe(won);
    });

    it('cannot finish a number that has no double finish', () => {
        // 301 - 142 = 159: three darts can make 159, but not with a double last.
        const state = play(game({ start: 301 }), 142, 0);
        expect(x01Remaining(state, 'p1')).toBe(159);
        expect(x01Check(state, 159)).toBe('invalid');
        expect(x01Check(state, 60)).toBe('score');
    });

    it('finishes straight away without double out', () => {
        const state = play(game({ start: 301, doubleOut: false }), 180, 0, 121);
        expect(legWinner(state)?.name).toBe('Anna');
    });

    it('undoes the last turn, a winning one too', () => {
        const won = play(game(), 180, 0, 180, 0, 141);
        const undone = undoTurn(won);
        expect(legWinner(undone)).toBeNull();
        expect(currentPlayer(undone)?.name).toBe('Anna');
        expect(undoTurn(game())).toEqual(game());
    });

    it('counts the leg, lets the next player start, and resets for a new game', () => {
        const won = play(game(), 180, 0, 180, 0, 141);
        expect(nextLeg(game())).toEqual(game());
        const second = nextLeg(won);
        expect(winsOf(second, 'p1')).toBe(1);
        expect(second.turns).toEqual([]);
        expect(currentPlayer(second)?.name).toBe('Bob');
        const fresh = toSetup(second);
        expect(fresh.phase).toBe('setup');
        expect(fresh.wins).toEqual([]);
        expect(fresh.players).toEqual(second.players);
    });

    it('lists the leg newest first with what was left after each turn', () => {
        const state = play(game(), 60, 45, 60);
        expect(turnLines(state).map((line) => [line.turn.playerId, line.after])).toEqual([
            ['p1', 381],
            ['p2', 456],
            ['p1', 441],
        ]);
    });

    it('keeps players and settings fixed once the game runs', () => {
        const state = game();
        expect(setDartsSettings(state, { start: 301 })).toBe(state);
        expect(setDartsPlayers(state, [])).toBe(state);
        expect(startGame(emptyDarts)).toBe(emptyDarts);
    });
});

describe('around the clock', () => {
    it('moves each player through 1 to 20 and finishes on the last', () => {
        let state = game({ mode: 'clock' });
        expect(clockTarget(state, 'p1')).toBe(1);
        expect(clockMaxHits(state)).toBe(3);
        state = clockThrow(state, 3);
        expect(clockTarget(state, 'p1')).toBe(4);
        expect(currentPlayer(state)?.name).toBe('Bob');
        state = clockThrow(state, 0);
        expect(clockHitRate(state, 'p1')).toBe(1);
        expect(clockHitRate(state, 'p2')).toBe(0);
        // Anna to 19 done, then the last one.
        for (let turn = 0; turn < 5; turn += 1) state = clockThrow(clockThrow(state, 3), 0);
        expect(clockProgress(state, 'p1')).toBe(18);
        expect(clockMaxHits(state)).toBe(2);
        expect(clockThrow(state, 3)).toBe(state);
        state = clockThrow(state, 2);
        expect(legWinner(state)?.name).toBe('Anna');
        expect(clockTarget(state, 'p1')).toBeNull();
    });

    it('adds the bull at the end when asked', () => {
        let state = game({ mode: 'clock', clockBull: true }, ['Anna']);
        for (let turn = 0; turn < 6; turn += 1) state = clockThrow(state, 3);
        expect(clockProgress(state, 'p1')).toBe(18);
        state = clockThrow(state, 2);
        expect(clockTarget(state, 'p1')).toBe(25);
        expect(legWinner(state)).toBeNull();
        state = clockThrow(state, 1);
        expect(legWinner(state)?.name).toBe('Anna');
    });

    it('refuses an x01 total in a clock game and the reverse', () => {
        const clock = game({ mode: 'clock' });
        expect(x01Check(clock, 60)).toBe('invalid');
        expect(clockThrow(game(), 2)).toEqual(game());
    });
});

describe('storage', () => {
    it('reads a stored game back, and nothing that does not fit', () => {
        const state = play(game({ start: 301 }), 60, 45);
        expect(parseDartsState(JSON.parse(JSON.stringify(state)))).toEqual(state);
        expect(parseDartsState({ ...state, v: 0 })).toBeNull();
        expect(
            parseDartsState({ ...state, settings: { ...state.settings, start: 401 } }),
        ).toBeNull();
        expect(
            parseDartsState({ ...state, turns: [{ playerId: 'p9', value: 1, bust: false }] }),
        ).toBeNull();
        expect(parseDartsState({ ...state, starter: 5 })).toBeNull();
        expect(parseDartsState({ ...state, wins: ['p9'] })).toBeNull();
        expect(parseDartsState('501')).toBeNull();
    });
});
