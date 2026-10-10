'use client';

import { Settings } from 'luxon';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import { TIME_ZONE } from '@bzim/types';

import i18n, { detectLocale } from '@/lib/i18n';
import { usePreferencesStore } from '@/store/use-preferences-store';

// Every date in the app is an Amsterdam date, whatever the device thinks.
Settings.defaultZone = TIME_ZONE;

/**
 * Applies the chosen locale to i18next, Luxon and the `<html lang>`.
 *
 * The locale lives in the persisted preferences store so it survives reloads
 * before login. Once the profile exists the server copy wins and is written
 * back into the store on sign-in.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
    const locale = usePreferencesStore((s) => s.locale);
    const hydrated = usePreferencesStore((s) => s.hydrated);
    const setLocale = usePreferencesStore((s) => s.setLocale);

    // First-ever visit: pick up the browser language.
    useEffect(() => {
        if (hydrated && locale === null) setLocale(detectLocale());
    }, [hydrated, locale, setLocale]);

    const active = locale ?? 'nl';
    useEffect(() => {
        if (i18n.language !== active) void i18n.changeLanguage(active);
        Settings.defaultLocale = active;
        document.documentElement.lang = active;
    }, [active]);

    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
