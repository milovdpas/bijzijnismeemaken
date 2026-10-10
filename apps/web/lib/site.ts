// App-level identity and origins, in one place. Read by the root metadata, the
// manifest and the API client, all of which must agree on the hostnames.

export const APP_NAME = 'Bij zijn is meemaken';
export const APP_TAGLINE = 'Plan activities with friends, see when everyone is free';

/**
 * The app's own public origin, with no trailing slash.
 *
 * `NEXT_PUBLIC_APP_URL` is inlined at build time. Left unset, local
 * development is assumed.
 */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
);

/** Where the browser reaches the Express API. Same build-time rule as above. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
    /\/$/,
    '',
);

/** Shown in settings so a bug report can say which build a phone runs. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

/** Where questions about the privacy policy and the terms go. */
export const LEGAL_CONTACT_EMAIL = 'vanderpasmilo@gmail.com';
/** The date on the legal pages; bump it when their wording changes in a way that matters. */
export const LEGAL_UPDATED = '11 October 2026';
