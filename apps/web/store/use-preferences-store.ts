import type { Locale } from '@bzim/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_PALETTE } from '@/lib/themes';

/**
 * Per-browser preferences. The only Zustand store in the app: server data
 * lives in TanStack Query, and this holds what has to work before sign-in or
 * is specific to this device.
 *
 * The colour scheme (light/dark/system) is not here: next-themes persists it
 * itself. The palette is, because it is ours.
 *
 * Persisted with a version so a later shape change can migrate additively.
 * `hydrated` is not persisted; it flips once localStorage has been read, and
 * `HydrationGate` waits for it.
 */
interface PreferencesState {
    /** `null` until detected from the browser or set by the user. */
    locale: Locale | null;
    /** A `PALETTES` id; see `lib/themes.ts`. */
    palette: string;
    /** Whether the one-time install prompt has been shown and closed. */
    installPromptSeen: boolean;
    hydrated: boolean;
    setLocale: (locale: Locale) => void;
    setPalette: (palette: string) => void;
    setInstallPromptSeen: () => void;
    setHydrated: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set) => ({
            locale: null,
            palette: DEFAULT_PALETTE,
            installPromptSeen: false,
            hydrated: false,
            setLocale: (locale) => set({ locale }),
            setPalette: (palette) => set({ palette }),
            setInstallPromptSeen: () => set({ installPromptSeen: true }),
            setHydrated: () => set({ hydrated: true }),
        }),
        {
            name: 'bzim-preferences',
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                locale: state.locale,
                palette: state.palette,
                installPromptSeen: state.installPromptSeen,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated();
            },
        },
    ),
);
