import { PROFILE } from '@bzim/types';

/**
 * A handle to propose from a display name: "Milo van der Pas" becomes
 * "milo_van_der_pas". Accents are stripped, anything that is not a letter,
 * digit or underscore becomes a single underscore, and the result is cut to
 * the maximum length. Empty when nothing usable is left.
 */
export function suggestHandle(displayName: string): string {
    return displayName
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, PROFILE.HANDLE_MAX_LENGTH)
        .replace(/_+$/, '');
}
