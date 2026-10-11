import { describe, expect, it } from 'vitest';
import { AVATAR_KEYS } from '@bzim/types';

import {
    PLAYER_NAME_MAX,
    addPlayer,
    cleanName,
    movePlayerUp,
    nextId,
    parsePlayers,
    rankPlayers,
    removePlayer,
} from './players';
import type { ToolPlayer } from './players';

function names(players: ToolPlayer[]): string[] {
    return players.map((player) => player.name);
}

function table(...list: string[]): ToolPlayer[] {
    let players: ToolPlayer[] = [];
    for (const name of list) {
        const result = addPlayer(players, name, null, 8);
        if (!result.ok) throw new Error(result.problem);
        players = result.players;
    }
    return players;
}

describe('players', () => {
    it('tidies a typed name and refuses an empty one', () => {
        expect(cleanName('  Anna   de  Vries ')).toBe('Anna de Vries');
        expect(cleanName('   ')).toBeNull();
        expect(cleanName('x'.repeat(PLAYER_NAME_MAX + 5))).toHaveLength(PLAYER_NAME_MAX);
    });

    it('counts ids up from the highest in use', () => {
        expect(nextId('p', [])).toBe('p1');
        expect(nextId('p', ['p1', 'p4', 'e9'])).toBe('p5');
    });

    it('adds players in order, with or without an avatar', () => {
        const avatar = AVATAR_KEYS[0];
        const first = addPlayer([], 'Anna', avatar, 4);
        if (!first.ok) throw new Error(first.problem);
        expect(first.players).toEqual([{ id: 'p1', name: 'Anna', avatarKey: avatar }]);
        const second = addPlayer(first.players, ' Bob ', null, 4);
        expect(second.ok && names(second.players)).toEqual(['Anna', 'Bob']);
    });

    it('says why a player cannot be added', () => {
        const players = table('Anna', 'Bob');
        expect(addPlayer(players, 'anna', null, 8)).toEqual({ ok: false, problem: 'taken' });
        expect(addPlayer(players, ' ', null, 8)).toEqual({ ok: false, problem: 'empty' });
        expect(addPlayer(players, 'Cas', null, 2)).toEqual({ ok: false, problem: 'full' });
    });

    it('removes a player and moves one up the order', () => {
        const players = table('Anna', 'Bob', 'Cas');
        expect(names(removePlayer(players, 'p2'))).toEqual(['Anna', 'Cas']);
        expect(names(movePlayerUp(players, 'p3'))).toEqual(['Anna', 'Cas', 'Bob']);
        expect(names(movePlayerUp(players, 'p1'))).toEqual(['Anna', 'Bob', 'Cas']);
        expect(names(movePlayerUp(players, 'nobody'))).toEqual(['Anna', 'Bob', 'Cas']);
    });

    it('ranks a final standing, ties sharing a place in the order of play', () => {
        const players = table('Anna', 'Bob', 'Cas', 'Dirk');
        const points: Record<string, number> = { p1: 10, p2: 30, p3: 10, p4: 5 };
        expect(
            rankPlayers(players, (player) => points[player.id] ?? 0).map((row) => [
                row.player.name,
                row.rank,
            ]),
        ).toEqual([
            ['Bob', 1],
            ['Anna', 2],
            ['Cas', 2],
            ['Dirk', 4],
        ]);
    });

    it('reads players back from storage, and nothing that is off', () => {
        const players = table('Anna', 'Bob');
        expect(parsePlayers(JSON.parse(JSON.stringify(players)), 8)).toEqual(players);
        expect(parsePlayers(players, 1)).toBeNull();
        expect(parsePlayers([{ id: 'p1', name: 'Anna', avatarKey: 'unicorn' }], 8)).toBeNull();
        expect(
            parsePlayers(
                [
                    { id: 'p1', name: 'Anna', avatarKey: null },
                    { id: 'p1', name: 'Bob', avatarKey: null },
                ],
                8,
            ),
        ).toBeNull();
        expect(parsePlayers([{ id: 'p1', name: '  ', avatarKey: null }], 8)).toBeNull();
        expect(parsePlayers('Anna', 8)).toBeNull();
    });
});
