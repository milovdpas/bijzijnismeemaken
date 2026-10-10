import { describe, expect, it } from 'vitest';

import Crypt from '../src/app/utils/Crypt';
import User from '../src/app/models/User.entity';
import { AppDataSource } from '../src/database/typeorm-db';
import { seedUser } from './support/factories';

describe('Crypt', () => {
    it('round-trips and never produces the same ciphertext twice', () => {
        const a = Crypt.encrypt('milo@example.com');
        const b = Crypt.encrypt('milo@example.com');

        expect(a).not.toBe(b);
        expect(a).not.toContain('example');
        expect(Crypt.decrypt(a)).toBe('milo@example.com');
        expect(Crypt.decrypt(b)).toBe('milo@example.com');
    });

    it('refuses a payload that was tampered with', () => {
        const payload = JSON.parse(Buffer.from(Crypt.encrypt('secret'), 'base64').toString()) as {
            iv: string;
            value: string;
            mac: string;
        };
        const tampered = Buffer.from(
            JSON.stringify({ ...payload, value: Crypt.encrypt('other') }),
        ).toString('base64');

        expect(() => Crypt.decrypt(tampered)).toThrow(/Mac is not valid/);
        expect(() => Crypt.decrypt('not base64 json')).toThrow(/cannot be parsed/);
        expect(() => Crypt.decrypt('')).toThrow(/MUST NOT be empty/);
    });

    it('builds the same blind index for every spelling of an address', () => {
        const hash = Crypt.searchHash('milo@example.com');

        expect(Crypt.searchHash('  MILO@Example.COM ')).toBe(hash);
        expect(Crypt.searchHash('other@example.com')).not.toBe(hash);
        expect(hash).toHaveLength(64);
    });

    it('compares secrets in constant time without throwing on odd input', () => {
        expect(Crypt.secureCompare('a', 'a')).toBe(true);
        expect(Crypt.secureCompare('a', 'ab')).toBe(false);
        expect(Crypt.secureCompare(undefined, 'a')).toBe(false);
    });
});

describe('users.email at rest', () => {
    it('is ciphertext in the table and plain through the entity', async () => {
        const user = await seedUser({ email: 'Plain@Example.com' });

        const [row] = await AppDataSource.query<{ email: string; email_hash: string }[]>(
            'SELECT email, email_hash FROM users WHERE id = ?',
            [user.id],
        );

        expect(row?.email).not.toContain('example');
        expect(Crypt.decrypt(row?.email ?? '')).toBe('Plain@Example.com');
        expect(row?.email_hash).toBe(Crypt.searchHash('plain@example.com'));

        const found = await User.findByEmail('PLAIN@example.com');
        expect(found?.id).toBe(user.id);
        expect(found?.email).toBe('Plain@Example.com');
    });

    it('keeps the index in step when the address changes', async () => {
        const user = await seedUser({ email: 'before@example.com' });
        user.email = 'after@example.com';
        await user.save();

        expect(await User.findByEmail('before@example.com')).toBeNull();
        expect((await User.findByEmail('after@example.com'))?.id).toBe(user.id);
    });
});
