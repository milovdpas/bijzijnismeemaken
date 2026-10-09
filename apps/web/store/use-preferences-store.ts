import type { Locale } from '@bzim/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Per-browser preferences. The only Zustand store in the app: server data
 * lives in TanStack Query, and this holds what has to work before sign-in or
 * is specific to this device.
 *
 * Persisted with a version so a later shape change can migrate additively.
 * `hydrated` is not persisted; it flips once localStorage has been read, and
 * `HydrationGate` waits for it.
 */
interface PreferencesState {
    /** `null` until detected from the browser or set by the user. */
    locale: Locale | null;
    /** Whether the one-time install prompt has been shown (used from task 31). */
    installPromptSeen: boolean;
    hydrated: boolean;
    setLocale: (locale: Locale) => void;
    setInstallPromptSeen: () => void;
    setHydrated: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set) => ({
            locale: null,
            installPromptSeen: false,
            hydrated: false,
            setLocale: (locale) => set({ locale }),
            setInstallPromptSeen: () => set({ installPromptSeen: true }),
            setHydrated: () => set({ hydrated: true }),
        }),
        {
            name: 'bzim-preferences',
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                locale: state.locale,
                installPromptSeen: state.installPromptSeen,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated();
            },
        },
    ),
);
