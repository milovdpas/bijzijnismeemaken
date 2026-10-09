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
    },
    status: {
        title: 'API status',
        checking: 'Checking the API...',
        ok: 'The API is up and reaches its database.',
        degraded: 'The API is up but cannot reach its database.',
        unreachable: 'The API could not be reached.',
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
