import crypto from 'node:crypto';
import type { ValueTransformer } from 'typeorm';

import { env } from '../../config/app';
import { normalizeEmail } from './Normalize';

interface Payload {
    iv: string;
    value: string;
    mac: string;
}

/**
 * Column encryption under `APP_KEY`, ported from the express boilerplate so
 * the payload format is the same one the other projects use.
 *
 * Encrypt-then-MAC: AES-256-CBC with a random IV, and an HMAC over IV + body
 * that is checked before anything is decrypted. The stored value is a base64
 * JSON `{ iv, value, mac }`. Rotating `APP_KEY` makes every encrypted column
 * unreadable and every blind index stale, so it is a migration, not a config
 * change.
 */
export default class Crypt {
    static readonly cipher = 'aes-256-cbc';
    static readonly sha = 'sha256';
    static readonly key: Buffer = env.appKey;

    /** A TypeORM transformer: encrypted at rest, plain in the entity. */
    static encryptColumn(): ValueTransformer {
        return {
            to: (value: string | null | undefined): string | null =>
                value === null || value === undefined || value === '' ? null : Crypt.encrypt(value),
            from: (value: string | null | undefined): string | null =>
                value === null || value === undefined || value === '' ? null : Crypt.decrypt(value),
        };
    }

    static encrypt(value: string): string {
        const iv = crypto.randomBytes(16);
        const base64Iv = iv.toString('base64');
        const cipher = crypto.createCipheriv(Crypt.cipher, Crypt.key, iv);

        let encrypted = cipher.update(value, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const payload: Payload = {
            iv: base64Iv,
            value: encrypted,
            mac: Crypt.hash(encrypted, base64Iv),
        };
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }

    /** Throws on a payload that is malformed or whose MAC does not check out. */
    static decrypt(payload: string): string {
        const parsed = Crypt.parsePayload(payload);
        const decipher = crypto.createDecipheriv(
            Crypt.cipher,
            Crypt.key,
            Buffer.from(parsed.iv, 'base64'),
        );

        let decrypted = decipher.update(parsed.value, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    /**
     * Keyed hash of a value, optionally prefixed with an IV. The MAC of a
     * payload, or a salted hash when no IV is given.
     */
    static hash(value: string, iv?: string): string {
        if (value === '') {
            throw new Error('Value is not defined!');
        }
        return crypto
            .createHmac(Crypt.sha, Crypt.key)
            .update(iv === undefined ? value : iv + value)
            .digest('hex');
    }

    /**
     * Digest for looking a record up by a value stored in an encrypted column
     * (a blind index). Use this rather than hashing the value yourself; the
     * write and read paths must agree exactly.
     *
     * - Keyed (HMAC under `APP_KEY`), so a guess cannot be tested without the
     *   key. An unkeyed SHA-256 would be trivially reversible for a low-entropy
     *   value like an email address, undoing the encryption it sits next to.
     * - Normalised through `normalizeEmail`, so `Foo@Example.com` is found by
     *   `foo@example.com`.
     * - Deterministic, since the query is `WHERE email_hash = ?`.
     */
    static searchHash(value: string): string {
        return Crypt.hash(normalizeEmail(value));
    }

    /**
     * Constant-time comparison of a submitted value against a secret.
     *
     * Compares SHA-256 digests rather than the raw strings so the buffers are
     * always 32 bytes: `timingSafeEqual` throws on different lengths, which
     * leaks the length via the exception path. Non-string input is false rather
     * than a throw, so an unset secret denies instead of crashing.
     */
    static secureCompare(a: unknown, b: unknown): boolean {
        if (typeof a !== 'string' || typeof b !== 'string') return false;
        const aDigest = crypto.createHash('sha256').update(a, 'utf8').digest();
        const bDigest = crypto.createHash('sha256').update(b, 'utf8').digest();
        return crypto.timingSafeEqual(aDigest, bDigest);
    }

    private static parsePayload(payload: string): Payload {
        if (payload === '') {
            throw new Error('Payload MUST NOT be empty!');
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(Buffer.from(payload, 'base64').toString());
        } catch {
            throw new Error('Payload cannot be parsed!');
        }
        if (!Crypt.isPayload(parsed)) {
            throw new Error('Payload is not valid!');
        }

        const expected = Buffer.from(Crypt.hash(parsed.value, parsed.iv), 'hex');
        const provided = Buffer.from(parsed.mac, 'hex');
        if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
            throw new Error('Mac is not valid!');
        }
        return parsed;
    }

    private static isPayload(value: unknown): value is Payload {
        return (
            typeof value === 'object' &&
            value !== null &&
            typeof (value as Payload).iv === 'string' &&
            typeof (value as Payload).value === 'string' &&
            typeof (value as Payload).mac === 'string'
        );
    }
}
