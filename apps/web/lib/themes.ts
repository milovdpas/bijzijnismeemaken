/**
 * Theming has two independent axes.
 *
 * - The **colour scheme** (system, light, dark) is handled by next-themes,
 *   which toggles the `dark` class on `<html>`.
 * - The **palette** is the style: which brand and ink colours fill the tokens.
 *   It is a `data-palette` attribute on `<html>`, applied by `PaletteApplier`,
 *   and every palette defines its tokens for both schemes in `globals.css`.
 *
 * Adding a style is therefore one entry below plus one CSS block
 * (`[data-palette='x']` and `.dark[data-palette='x']`). Components never
 * reference a palette by name; they only use the tokens.
 */

export const COLOR_SCHEMES = ['system', 'light', 'dark'] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export interface Palette {
    id: string;
    labelKey: string;
    /** Two swatches for the picker: brand and ink, as CSS colours. */
    swatch: [string, string];
}

export const PALETTES: readonly Palette[] = [
    { id: 'sunny', labelKey: 'settings.paletteSunny', swatch: ['#ffc72c', '#223074'] },
];

export const DEFAULT_PALETTE = 'sunny';

export function isPaletteId(value: unknown): value is string {
    return typeof value === 'string' && PALETTES.some((palette) => palette.id === value);
}
