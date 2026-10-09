'use client';

import { useEffect } from 'react';

import { DEFAULT_PALETTE } from '@/lib/themes';
import { usePreferencesStore } from '@/store/use-preferences-store';

/**
 * Mirrors the chosen palette onto `<html data-palette>`, where the CSS reads
 * it. Renders nothing. Mounted in the root layout, beside the theme provider,
 * so the login page is styled the same as the app.
 *
 * Until the store has rehydrated the default palette applies, which is also
 * what the server rendered, so there is no flash for anyone on the default.
 */
export function PaletteApplier() {
    const palette = usePreferencesStore((s) => s.palette);

    useEffect(() => {
        document.documentElement.dataset.palette = palette ?? DEFAULT_PALETTE;
    }, [palette]);

    return null;
}
