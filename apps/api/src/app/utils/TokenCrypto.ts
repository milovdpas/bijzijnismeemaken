import crypto from 'node:crypto';
import type { ValueTransformer } from 'typeorm';

import { env } from '../../config/app';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Provider tokens at rest, under `CALENDAR_TOKEN_KEY` (docs/02 §2.6).
 *
 * AES-256-GCM, so the tag authenticates the ciphertext and a tampered or
 * re-keyed value fails to decrypt rather than decrypting to garbage. The
 * stored bytes are `iv (12) | tag (16) | ciphertext`, a binary column rather
 * than the JSON envelope `Crypt` uses for text, because a refresh token is
 * read only to be sent to Google and never searched. Its own key keeps a
 * calendar incident apart from the email column, and lets the two rotate on
 * their own.
 */
export default class TokenCrypto {
    /** A TypeORM transformer: encrypted bytes in the column, the plain token in the entity. */
    static column(): ValueTransformer {
        return {
            to: (value: string | null | undefined): Buffer | null =>
                value === null || value === undefined || value === ''
                    ? null
                    : TokenCrypto.encrypt(value),
            from: (value: Buffer | null | undefined): string | null =>
                value === null || value === undefined ? null : TokenCrypto.decrypt(value),
        };
    }

    static encrypt(plain: string): Buffer {
        const iv = crypto.randomBytes(IV_BYTES);
        const cipher = crypto.createCipheriv(ALGORITHM, TokenCrypto.key(), iv);
        const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
        return Buffer.concat([iv, cipher.getAuthTag(), body]);
    }

    /** Throws on a value that is too short, tampered with, or encrypted under another key. */
    static decrypt(stored: Buffer): string {
        if (stored.length < IV_BYTES + TAG_BYTES) {
            throw new Error('Encrypted token is too short to be one');
        }
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            TokenCrypto.key(),
            stored.subarray(0, IV_BYTES),
        );
        decipher.setAuthTag(stored.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
        return Buffer.concat([
            decipher.update(stored.subarray(IV_BYTES + TAG_BYTES)),
            decipher.final(),
        ]).toString('utf8');
    }

    private static key(): Buffer {
        if (env.calendarTokenKey === null) {
            throw new Error('CALENDAR_TOKEN_KEY is not set, so calendar tokens cannot be stored');
        }
        return env.calendarTokenKey;
    }
}
