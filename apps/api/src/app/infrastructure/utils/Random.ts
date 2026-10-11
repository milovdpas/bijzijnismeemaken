import { randomInt } from 'node:crypto';

/** A fair shuffle (Fisher-Yates) from the crypto generator; the input stays as it was. */
export function shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const other = randomInt(index + 1);
        const here = result[index];
        const there = result[other];
        if (here === undefined || there === undefined) continue;
        result[index] = there;
        result[other] = here;
    }
    return result;
}
