import { describe, expect, it } from 'vitest';
import { ScoreType } from '@bzim/types';

import { maskTimeInput, parseScore, scoreToInput } from './score-input';

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

describe('maskTimeInput', () => {
    it('puts the colons in from the right while digits are typed', () => {
        expect(maskTimeInput('1')).toBe('1');
        expect(maskTimeInput('12')).toBe('12');
        expect(maskTimeInput('123')).toBe('1:23');
        expect(maskTimeInput('1234')).toBe('12:34');
        expect(maskTimeInput('10203')).toBe('1:02:03');
        expect(parseScore(maskTimeInput('10203'), ScoreType.TIME)).toBe(3_723_000);
    });

    it('starts the milliseconds at the dot or comma of a phone pad', () => {
        expect(maskTimeInput('123.')).toBe('1:23.');
        expect(maskTimeInput('123,45')).toBe('1:23.45');
        expect(maskTimeInput('123.4567')).toBe('1:23.456');
        expect(maskTimeInput(',5')).toBe('0.5');
        expect(parseScore(maskTimeInput('123,45'), ScoreType.TIME)).toBe(83_450);
    });

    it('redoes typed colons, so deleting never gets stuck, and keeps what it wrote', () => {
        expect(maskTimeInput('1:2')).toBe('12');
        expect(maskTimeInput('1:23:4')).toBe('12:34');
        expect(maskTimeInput('0123')).toBe('1:23');
        expect(maskTimeInput('')).toBe('');
        for (const time of ['1:23.450', '1:02:03.450', '45', '0.5']) {
            expect(maskTimeInput(time)).toBe(time);
        }
        expect(maskTimeInput(scoreToInput(3_723_450, ScoreType.TIME))).toBe('1:02:03.450');
    });
});
