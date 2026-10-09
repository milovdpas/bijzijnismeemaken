'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

import { dateLocaleFor, setDateLocale } from '@/lib/date-locale';
import i18n, { detectLocale } from '@/lib/i18n';
import { usePreferencesStore } from '@/store/use-preferences-store';

/**
 * Applies the chosen locale to i18next, date-fns and the `<html lang>`.
 *
 * The locale lives in the persisted preferences store so it survives reloads
 * before login. Once the profile exists (task 10) the server copy wins and is
 * written back into the store on sign-in.
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
        setDateLocale(dateLocaleFor(active));
        document.documentElement.lang = active;
    }, [active]);

    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
