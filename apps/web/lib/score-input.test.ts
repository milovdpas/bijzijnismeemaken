import { describe, expect, it } from 'vitest';
import { ScoreType } from '@bzim/types';

import { parseScore, scoreToInput, steppedScore } from './score-input';

describe('parseScore', () => {
    it('reads points with a dot or a comma, and refuses anything else', () => {
        expect(parseScore('12', ScoreType.NUMBER)).toBe(12);
        expect(parseScore('12,5', ScoreType.NUMBER)).toBe(12.5);
        expect(parseScore(' 0.125 ', ScoreType.NUMBER)).toBe(0.125);
        expect(parseScore('', ScoreType.NUMBER)).toBeNull();
        expect(parseScore('-1', ScoreType.NUMBER)).toBeUndefined();
        expect(parseScore('1.2345', ScoreType.NUMBER)).toBeUndefined();
        expect(parseScore('veel', ScoreType.NUMBER)).toBeUndefined();
    });

    it('reads a time in its usual shapes as milliseconds', () => {
        expect(parseScore('1:02:03.450', ScoreType.TIME)).toBe(3_723_450);
        expect(parseScore('1:23', ScoreType.TIME)).toBe(83_000);
        expect(parseScore('0:05.007', ScoreType.TIME)).toBe(5_007);
        expect(parseScore('5.5', ScoreType.TIME)).toBe(5_500);
        expect(parseScore('45', ScoreType.TIME)).toBe(45_000);
        expect(parseScore('1:60', ScoreType.TIME)).toBeUndefined();
        expect(parseScore('abc', ScoreType.TIME)).toBeUndefined();
    });
});

describe('scoreToInput', () => {
    it('writes what parseScore reads back', () => {
        expect(scoreToInput(12.5, ScoreType.NUMBER)).toBe('12.5');
        expect(scoreToInput(3_723_450, ScoreType.TIME)).toBe('1:02:03.450');
        expect(parseScore(scoreToInput(83_000, ScoreType.TIME), ScoreType.TIME)).toBe(83_000);
        expect(scoreToInput(null, ScoreType.TIME)).toBe('');
    });
});

describe('steppedScore', () => {
    it('steps by one and stops at zero', () => {
        expect(steppedScore(10, 1)).toBe(11);
        expect(steppedScore(0.5, -1)).toBe(0);
        expect(steppedScore(1.1, 1)).toBe(2.1);
    });
});
