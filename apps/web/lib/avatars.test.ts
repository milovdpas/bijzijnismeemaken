import { describe, expect, it } from 'vitest';
import { AVATAR_KEYS, AVATAR_STYLES, isAvatarKey, parseAvatarKey } from '@bzim/types';

import {
    AVATARS,
    avatarPages,
    avatarTile,
    candidateSeeds,
    generatedAvatarUrl,
    randomAvatarKey,
} from './avatars';

describe('avatar keys', () => {
    it('reads an icon key and a generated style with its seed', () => {
        expect(parseAvatarKey('cat')).toEqual({ kind: 'icon', key: 'cat' });
        expect(parseAvatarKey('open-peeps:k3j9x2')).toEqual({
            kind: 'generated',
            style: 'open-peeps',
            seed: 'k3j9x2',
        });
    });

    it('refuses anything else, so a stored key always draws', () => {
        for (const value of [
            'unicorn',
            'adventurer:k3j9x2',
            'lorelei:',
            'lorelei:UPPER',
            'lorelei:a:b',
            `thumbs:${'a'.repeat(17)}`,
            ':abc',
        ]) {
            expect(parseAvatarKey(value)).toBeNull();
        }
        expect(isAvatarKey(42)).toBe(false);
        expect(isAvatarKey('thumbs:abc')).toBe(true);
    });

    it('fits the longest style and seed in the 32-character column', () => {
        const longest = Math.max(...AVATAR_STYLES.map((style) => style.length));
        expect(longest + 1 + 16).toBeLessThanOrEqual(32);
    });
});

describe('avatar drawing', () => {
    it('gives icons their own tile and a generated face a stable one from the same colours', () => {
        expect(avatarTile({ kind: 'icon', key: 'cat' })).toBe(AVATARS.cat.tile);
        const face = { kind: 'generated', style: 'lorelei', seed: 'k3j9x2' } as const;
        const tile = avatarTile(face);
        expect(avatarTile(face)).toBe(tile);
        expect(Object.values(AVATARS).map((avatar) => avatar.tile)).toContain(tile);
    });

    it('draws a generated face from the app route', () => {
        expect(generatedAvatarUrl('pixel-art', 'abc')).toBe('/avatars/pixel-art/abc');
    });

    it('offers the same first page everywhere and another page after a shuffle', () => {
        const first = candidateSeeds(0, 12);
        expect(candidateSeeds(0, 12)).toEqual(first);
        expect(new Set(first).size).toBe(12);
        expect(candidateSeeds(7, 12)).not.toEqual(first);
        for (const seed of first) {
            expect(isAvatarKey(`thumbs:${seed}`)).toBe(true);
        }
    });

    it('keeps the icon pages and guest faces to icons', () => {
        expect(avatarPages().flat()).toEqual([...AVATAR_KEYS]);
        expect(AVATAR_KEYS).toContain(randomAvatarKey());
    });
});
