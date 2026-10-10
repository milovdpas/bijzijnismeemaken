import { describe, expect, it } from 'vitest';
import { Daypart } from '@bzim/types';

import { awaitsConfirmation, describeOccurrence } from './occurrence-format';

const label = (daypart: Daypart) => `[${daypart}]`;

describe('describeOccurrence', () => {
    it('prefers the time, then the daypart, then just the day', () => {
        expect(describeOccurrence('2026-11-06', Daypart.EVENING, '19:30', 'nl', label)).toBe(
            'vrijdag 6 november · 19:30',
        );
        expect(describeOccurrence('2026-11-06', Daypart.EVENING, null, 'en', label)).toBe(
            'Friday 6 November · [evening]',
        );
        expect(describeOccurrence('2026-11-06', null, null, 'en', label, 'ccc d LLL')).toBe(
            'Fri 6 Nov',
        );
    });
});

describe('awaitsConfirmation', () => {
    it('is true only for days gone by', () => {
        expect(awaitsConfirmation('2026-11-05', '2026-11-06')).toBe(true);
        expect(awaitsConfirmation('2026-11-06', '2026-11-06')).toBe(false);
        expect(awaitsConfirmation('2026-11-07', '2026-11-06')).toBe(false);
    });
});
