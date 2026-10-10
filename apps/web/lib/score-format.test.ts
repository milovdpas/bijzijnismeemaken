import { describe, expect, it } from 'vitest';
import { ScoreType } from '@bzim/types';

import { formatScore } from './score-format';

describe('formatScore', () => {
    it('formats points in the locale with up to three decimals', () => {
        expect(formatScore(1234.5, ScoreType.NUMBER, 'en')).toBe('1,234.5');
        expect(formatScore(1234.5, ScoreType.NUMBER, 'nl')).toBe('1.234,5');
        expect(formatScore(12.3456, ScoreType.NUMBER, 'en')).toBe('12.346');
        expect(formatScore(7, ScoreType.NUMBER, undefined)).toBe('7');
    });

    it('formats a time from milliseconds, dropping what is zero at the ends', () => {
        expect(formatScore(3_723_450, ScoreType.TIME, 'en')).toBe('1:02:03.450');
        expect(formatScore(83_000, ScoreType.TIME, 'en')).toBe('1:23');
        expect(formatScore(5_007, ScoreType.TIME, 'en')).toBe('0:05.007');
        expect(formatScore(0, ScoreType.TIME, 'en')).toBe('0:00');
    });
});
