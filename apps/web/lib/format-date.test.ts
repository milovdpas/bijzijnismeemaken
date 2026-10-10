import { describe, expect, it } from 'vitest';

import { formatDate } from './format-date';

describe('formatDate', () => {
    it('shows the Amsterdam calendar day in the chosen language', () => {
        // 23:30 UTC on 2 October is already 3 October in Amsterdam.
        expect(formatDate('2026-10-02T23:30:00.000Z', 'nl')).toBe('3 okt 2026');
        expect(formatDate('2026-10-02T23:30:00.000Z', 'en')).toBe('Oct 3, 2026');
    });

    it('falls back to Dutch', () => {
        expect(formatDate('2026-10-10T12:00:00.000Z', undefined)).toBe('10 okt 2026');
    });
});
