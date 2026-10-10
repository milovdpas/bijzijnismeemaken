import { format } from 'date-fns';

import { dateLocaleFor } from './date-locale';

/** A calendar date for people, in the app's language: "3 okt 2026" or "Oct 3, 2026". */
export function formatDate(iso: string, lang: string | undefined): string {
    return format(new Date(iso), 'PP', { locale: dateLocaleFor(lang) });
}
