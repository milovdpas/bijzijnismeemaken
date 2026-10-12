import { describe, expect, it } from 'vitest';

import { storedDestination } from './after-setup';

const NOW = Date.UTC(2026, 9, 12, 20, 0);
const HOUR = 60 * 60 * 1000;

describe('storedDestination', () => {
    it('gives back an in-app path from the last day', () => {
        expect(storedDestination({ path: '/join/klaverjassen-abc', at: NOW - HOUR }, NOW)).toBe(
            '/join/klaverjassen-abc',
        );
    });

    it('forgets what is older than a day, or not a safe path, or not a stored place', () => {
        expect(storedDestination({ path: '/join/x', at: NOW - 25 * HOUR }, NOW)).toBeNull();
        expect(storedDestination({ path: '/join/x', at: NOW + HOUR }, NOW)).toBeNull();
        expect(storedDestination({ path: '//evil.example', at: NOW }, NOW)).toBeNull();
        expect(storedDestination({ path: 3, at: NOW }, NOW)).toBeNull();
        expect(storedDestination(null, NOW)).toBeNull();
    });
});
