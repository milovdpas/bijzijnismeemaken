/**
 * The typed source of every translation. `nl.ts` is typed against `Dict`, so
 * a key present here and missing there is a compile error. The reverse (a key
 * used in a component but defined nowhere) is caught by `keys.test.ts`.
 *
 * Deliberately not `as const`: that would make every value a literal type and
 * break the `nl: Dict` typing.
 */
export const en = {
    common: {
        appName: 'Bij zijn is meemaken',
        cancel: 'Cancel',
        save: 'Save',
        close: 'Close',
        loading: 'Loading',
        toggleTheme: 'Toggle theme',
    },
    nav: {
        groups: 'Groups',
        settings: 'Settings',
    },
    groups: {
        title: 'Groups',
        subtitle: 'The friend groups you are part of.',
        create: 'New group',
        emptyTitle: 'No groups yet',
        emptyDescription:
            'Start a group for your friends, or join one with an invite link. Everything else lives inside a group.',
    },
    settings: {
        title: 'Settings',
        subtitle: 'How the app looks and talks to you.',
        appearance: 'Appearance',
        appearanceDescription: 'Follow your device, or pick one.',
        colorScheme: 'Colour scheme',
        palette: 'Style',
        paletteSunny: 'Sunny',
        themeLight: 'Light',
        themeDark: 'Dark',
        themeSystem: 'System',
        language: 'Language',
        languageDescription: 'Used in the app and in the emails you get.',
        version: 'Version {{version}}',
    },
    status: {
        title: 'API status',
        description: 'Whether the app can reach its server.',
        checking: 'Checking...',
        ok: 'Up and reaching its database.',
        degraded: 'Up, but cannot reach its database.',
        unreachable: 'Could not be reached.',
    },
    errors: {
        UNAUTHENTICATED: 'You are signed out. Sign in again to continue.',
        FORBIDDEN: 'You are not allowed to do that.',
        NOT_FOUND: 'That no longer exists.',
        VALIDATION_FAILED: 'Some of the fields are not valid.',
        CONFLICT: 'That conflicts with something that already exists.',
        RATE_LIMITED: 'Too many requests. Try again in a moment.',
        OWNER_MUST_TRANSFER: 'Transfer ownership of your groups first.',
        WORKER_BUSY: 'That job is still running.',
        PROVIDER_ERROR: 'An external service failed. Try again later.',
        INTERNAL_ERROR: 'Something went wrong on our side.',
        NETWORK: 'No connection. Check your network and try again.',
    },
};

export type Dict = typeof en;
