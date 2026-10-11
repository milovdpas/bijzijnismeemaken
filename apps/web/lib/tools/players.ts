import { AVATAR_KEYS, PROFILE } from '@bzim/types';
import type { AvatarKey } from '@bzim/types';

import { isRecord } from './guards';

/**
 * Somebody in a game. A group member brings their avatar; a guest is a
 * typed name. Ids are counted (`p1`, `p2`), not random, so every tool's
 * logic stays deterministic and testable.
 */
export interface ToolPlayer {
    id: string;
    name: string;
    avatarKey: AvatarKey | null;
}

/** The same limit as a display name, so a member's name always fits. */
export const PLAYER_NAME_MAX = PROFILE.DISPLAY_NAME_MAX_LENGTH;

/** The next free id with this prefix: one above the highest in use. */
export function nextId(prefix: string, taken: readonly string[]): string {
    let highest = 0;
    for (const id of taken) {
        if (!id.startsWith(prefix)) continue;
        const number = Number(id.slice(prefix.length));
        if (Number.isInteger(number) && number > highest) highest = number;
    }
    return `${prefix}${String(highest + 1)}`;
}

/** A typed name, tidied: trimmed, single spaces, cut to the limit; null when nothing is left. */
export function cleanName(raw: string): string | null {
    const name = raw.trim().replace(/\s+/g, ' ').slice(0, PLAYER_NAME_MAX).trim();
    return name === '' ? null : name;
}

export type AddPlayerProblem = 'empty' | 'taken' | 'full';

export type AddPlayerResult =
    { ok: true; players: ToolPlayer[] } | { ok: false; problem: AddPlayerProblem };

/**
 * The list with one more player at the end, or why not. Names are unique
 * regardless of case: two people called Anna get told apart before the
 * game starts rather than on the scoreboard.
 */
export function addPlayer(
    players: readonly ToolPlayer[],
    raw: string,
    avatarKey: AvatarKey | null,
    max: number,
): AddPlayerResult {
    const name = cleanName(raw);
    if (name === null) return { ok: false, problem: 'empty' };
    if (players.length >= max) return { ok: false, problem: 'full' };
    if (players.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
        return { ok: false, problem: 'taken' };
    }
    const id = nextId(
        'p',
        players.map((player) => player.id),
    );
    return { ok: true, players: [...players, { id, name, avatarKey }] };
}

export function removePlayer(players: readonly ToolPlayer[], id: string): ToolPlayer[] {
    return players.filter((player) => player.id !== id);
}

/** One place earlier in the order of play; the first player stays first. */
export function movePlayerUp(players: readonly ToolPlayer[], id: string): ToolPlayer[] {
    const index = players.findIndex((player) => player.id === id);
    const above = players[index - 1];
    const player = players[index];
    if (index <= 0 || above === undefined || player === undefined) return [...players];
    const next = [...players];
    next[index - 1] = player;
    next[index] = above;
    return next;
}

/** Players read back from storage; null when anything about them is off. */
export function parsePlayers(raw: unknown, max: number): ToolPlayer[] | null {
    if (!Array.isArray(raw) || raw.length > max) return null;
    const players: ToolPlayer[] = [];
    for (const item of raw) {
        if (!isRecord(item)) return null;
        const { id, name, avatarKey } = item;
        if (typeof id !== 'string' || id === '') return null;
        if (typeof name !== 'string' || cleanName(name) !== name) return null;
        if (avatarKey !== null && !isAvatarKey(avatarKey)) return null;
        players.push({ id, name, avatarKey });
    }
    return new Set(players.map((player) => player.id)).size === players.length ? players : null;
}

function isAvatarKey(value: unknown): value is AvatarKey {
    return typeof value === 'string' && (AVATAR_KEYS as readonly string[]).includes(value);
}
