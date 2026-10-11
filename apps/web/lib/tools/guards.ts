/**
 * Small checks for reading a tool's state back from storage. What is stored
 * was written by this app, but possibly by an older version of it, so every
 * field is checked before the game trusts it.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isIntegerIn(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
