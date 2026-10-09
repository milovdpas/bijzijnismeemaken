import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing with Node's own scrypt: nothing native to compile in the
 * alpine image, and parameters at the OWASP-recommended level.
 *
 * The stored form is self-describing, `scrypt$N$r$p$salt$hash` (salt and hash
 * base64url), so the cost can be raised later and old hashes still verify
 * until their owner next signs in and is rehashed.
 */
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await derive(password, salt, N, R, P);
    return [
        'scrypt',
        String(N),
        String(R),
        String(P),
        salt.toString('base64url'),
        key.toString('base64url'),
    ].join('$');
}

/** Constant-time comparison; a malformed stored value is simply "no match". */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [scheme, n, r, p, salt, hash] = stored.split('$');
    if (
        scheme !== 'scrypt' ||
        n === undefined ||
        r === undefined ||
        p === undefined ||
        salt === undefined ||
        hash === undefined
    ) {
        return false;
    }
    const expected = Buffer.from(hash, 'base64url');
    const actual = await derive(
        password,
        Buffer.from(salt, 'base64url'),
        Number(n),
        Number(r),
        Number(p),
    );
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * A hash nobody can log in with, for equalising the time a login takes.
 *
 * A login against an account without a password (Google-only, or none at all)
 * still runs a full verification against this, so the response takes as long
 * as a wrong password does and the timing says nothing about whether the
 * email exists.
 */
export const DUMMY_HASH_PROMISE: Promise<string> = hashPassword(
    randomBytes(32).toString('base64url'),
);

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        // maxmem has to cover 128 * N * r bytes, which the default (32 MiB) does
        // not at N = 2^15.
        scrypt(password, salt, KEY_LENGTH, { N: n, r, p, maxmem: 256 * n * r }, (error, key) => {
            if (error !== null) reject(error);
            else resolve(key);
        });
    });
}
