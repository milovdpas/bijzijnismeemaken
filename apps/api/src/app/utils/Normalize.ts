/**
 * The one definition of "the same handle" and "the same email".
 *
 * Every path that stores, compares or looks up one of these goes through
 * here, so the write side and the read side can never disagree on casing or
 * whitespace: the zod schemas, the blind index, the uniqueness check and the
 * search all normalise identically.
 */

export function normalizeHandle(raw: string): string {
    return raw.trim().toLowerCase();
}

export function normalizeEmail(raw: string): string {
    return raw.trim().toLowerCase();
}
