import { describe, expect, it } from 'vitest';

import TokenCrypto from '../src/app/infrastructure/utils/TokenCrypto';

describe('TokenCrypto', () => {
    it('round-trips a token into bytes that differ every time and never contain it', () => {
        const a = TokenCrypto.encrypt('1//refresh-token');
        const b = TokenCrypto.encrypt('1//refresh-token');

        expect(a.equals(b)).toBe(false);
        expect(a.toString('latin1')).not.toContain('refresh');
        expect(TokenCrypto.decrypt(a)).toBe('1//refresh-token');
        expect(TokenCrypto.decrypt(b)).toBe('1//refresh-token');
    });

    it('refuses bytes that were tampered with or are not a token at all', () => {
        const stored = TokenCrypto.encrypt('secret');
        const flipped = Buffer.from(stored);
        const last = flipped[flipped.length - 1] ?? 0;
        flipped[flipped.length - 1] = last ^ 0xff;

        expect(() => TokenCrypto.decrypt(flipped)).toThrow();
        expect(() => TokenCrypto.decrypt(Buffer.from('short'))).toThrow(/too short/);
    });

    it('keeps the transformer symmetric and null-safe', () => {
        const column = TokenCrypto.column();
        const to = (value: string | null): Buffer | null =>
            column.to?.call(column, value) as Buffer | null;
        const from = (value: Buffer | null): string | null =>
            column.from?.call(column, value) as string | null;

        expect(to(null)).toBeNull();
        expect(to('')).toBeNull();
        expect(from(null)).toBeNull();
        expect(from(to('abc'))).toBe('abc');
    });
});
