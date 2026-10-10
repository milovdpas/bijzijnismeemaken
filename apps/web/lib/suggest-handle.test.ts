import { describe, expect, it } from 'vitest';

import { suggestHandle } from './suggest-handle';

describe('suggestHandle', () => {
    it('lowercases and joins words with underscores', () => {
        expect(suggestHandle('Milo van der Pas')).toBe('milo_van_der_pas');
    });

    it('strips accents and punctuation', () => {
        expect(suggestHandle('Zoë O’Brien-Smit')).toBe('zoe_o_brien_smit');
        expect(suggestHandle('  Anna!!  ')).toBe('anna');
    });

    it('cuts to the maximum length without a dangling underscore', () => {
        expect(suggestHandle('abcdefghijklmnopqrstuvw xyz')).toBe('abcdefghijklmnopqrstuvw');
    });

    it('gives nothing for names with nothing usable', () => {
        expect(suggestHandle('🎉🎉')).toBe('');
        expect(suggestHandle('')).toBe('');
    });
});
