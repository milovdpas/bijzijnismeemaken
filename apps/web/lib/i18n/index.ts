import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Locale } from '@bzim/types';

import { en } from './locales/en';
import { nl } from './locales/nl';

export const LOCALE_LABELS: Record<Locale, string> = {
    [Locale.NL]: 'Nederlands',
    [Locale.EN]: 'English',
};

if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
        resources: {
            [Locale.EN]: { translation: en },
            [Locale.NL]: { translation: nl },
        },
        // Dutch first: it is the group's language. English is the fallback so a
        // key missing from nl.ts (a compile error anyway) never renders raw.
        lng: Locale.NL,
        fallbackLng: Locale.EN,
        interpolation: { escapeValue: false },
        returnNull: false,
    });
} else {
    // Hot reload. The instance survives a re-evaluation of this module, so
    // the dictionaries edited a moment ago would otherwise never reach it and
    // every new key would render as its own name until a full restart.
    i18n.addResourceBundle(Locale.EN, 'translation', en, true, true);
    i18n.addResourceBundle(Locale.NL, 'translation', nl, true, true);
}

/** Best-effort browser locale detection, restricted to supported locales. */
export function detectLocale(): Locale {
    if (typeof navigator === 'undefined') return Locale.NL;
    return navigator.language.toLowerCase().startsWith('en') ? Locale.EN : Locale.NL;
}

export default i18n;
