import { createHash, randomBytes } from 'node:crypto';

/**
 * Opaque random tokens: refresh token ids, invite links, OAuth states.
 *
 * 256 bits of randomness, base64url so they survive a URL and a cookie without
 * escaping. Anything that identifies a user over time is a JWT instead (see
 * `JWT.ts`, task 7); these are for values that are looked up, not decoded.
 */
export function generateToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
}

/**
 * Hashed with plain SHA-256, not bcrypt, and that is deliberate.
 *
 * Password hashing is deliberately slow to survive being guessed. These tokens
 * are machine-generated randomness, so guessing is not the threat and slowness
 * would only make every lookup expensive. Hashing at all is what stops a
 * database dump handing over every live refresh token.
 */
export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}
