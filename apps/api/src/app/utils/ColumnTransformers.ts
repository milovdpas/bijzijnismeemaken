import type { ValueTransformer } from 'typeorm';

/**
 * Reads a MySQL `decimal` back as a number.
 *
 * The driver returns decimals as strings, and deliberately: a decimal can hold
 * values a JavaScript number cannot represent exactly, so handing back a float
 * would quietly lose precision. For coordinates at six decimal places that risk
 * is nil, and a latitude arriving as `"52.090700"` is a real hazard, because it
 * survives arithmetic as string concatenation and reaches an API as nonsense.
 *
 * Converting at the boundary means the rest of the code sees the number the
 * column type promises.
 */
export const decimalTransformer: ValueTransformer = {
    to: (value: number | null): number | null => value,
    from: (value: string | number | null): number | null => {
        if (value === null || value === undefined) {
            return null;
        }
        return typeof value === 'number' ? value : Number.parseFloat(value);
    },
};

/**
 * A MySQL `time` column as the API speaks it: `19:30`.
 *
 * The driver hands back `19:30:00`; the API's `LocalTimeString` has no
 * seconds, because nothing here is scheduled to the second and a form field
 * should not have to invent them.
 */
export const timeTransformer: ValueTransformer = {
    to: (value: string | null): string | null => value,
    from: (value: string | null): string | null => (value === null ? null : value.slice(0, 5)),
};
