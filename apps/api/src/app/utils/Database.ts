/**
 * Small helpers for building queries. Anything two services would otherwise
 * each write their own version of.
 */

/**
 * Escapes a value for use inside a LIKE pattern: `%` and `_` are wildcards
 * there, and a search term or a handle prefix must match itself literally.
 * The caller adds its own `%` around the result.
 */
export function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
}
