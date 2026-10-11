import { Daypart } from './enums';

/* -------------------------------------------------------------------------- */
/* Time                                                                        */
/* -------------------------------------------------------------------------- */

/** The one timezone the platform reasons in. The database stores UTC. */
export const TIME_ZONE = 'Europe/Amsterdam';

export interface DaypartRange {
    /** Inclusive start hour in Europe/Amsterdam wall-clock time. */
    startHour: number;
    /** Exclusive end hour; 24 means midnight at the end of the day. */
    endHour: number;
}

/**
 * Fixed daypart boundaries. Events outside them (between midnight and 08:00)
 * never make anyone busy, because nothing gets planned then.
 */
export const DAYPARTS: Readonly<Record<Daypart, DaypartRange>> = {
    [Daypart.MORNING]: { startHour: 8, endHour: 12 },
    [Daypart.AFTERNOON]: { startHour: 12, endHour: 18 },
    [Daypart.EVENING]: { startHour: 18, endHour: 24 },
};

/** Display and iteration order. */
export const DAYPART_ORDER: readonly Daypart[] = [
    Daypart.MORNING,
    Daypart.AFTERNOON,
    Daypart.EVENING,
];

/* -------------------------------------------------------------------------- */
/* Limits                                                                      */
/* -------------------------------------------------------------------------- */

export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
} as const;

export const WIDGETS = {
    MAX_PER_GROUP: 20,
    UPCOMING_WEEKS_MIN: 1,
    UPCOMING_WEEKS_MAX: 12,
    UPCOMING_WEEKS_DEFAULT: 4,
    LIMIT_MIN: 1,
    LIMIT_MAX: 10,
    LIMIT_DEFAULT: 5,
    NOTE_TITLE_MAX_LENGTH: 60,
    NOTE_BODY_MAX_LENGTH: 1000,
    LINK_LABEL_MAX_LENGTH: 60,
    URL_MAX_LENGTH: 500,
} as const;

export const LEADERBOARD = {
    /** Ranks below this are never listed; pages past it come back empty. */
    RANK_LIMIT: 500,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 60,
    DESCRIPTION_MAX_LENGTH: 1000,
    /** DECIMAL(16,3): thirteen digits before the point. Times are milliseconds, so ~317 years. */
    SCORE_MAX: 9_999_999_999_999,
    SCORE_DECIMALS: 3,
    /** How many of the card ranking the list shows per board. */
    CARD_TOP: 3,
    /** A player without an account: a name on the board. Same bounds as a display name. */
    GUEST_NAME_MIN_LENGTH: 2,
    GUEST_NAME_MAX_LENGTH: 40,
} as const;

export const ACTIVITY = {
    TITLE_MIN_LENGTH: 2,
    TITLE_MAX_LENGTH: 80,
    DESCRIPTION_MAX_LENGTH: 2000,
    LOCATION_MAX_LENGTH: 120,
    URL_MAX_LENGTH: 500,
    NOTES_MAX_LENGTH: 255,
    /** Minutes; a day at most, so a wrongly typed value cannot block a whole week. */
    DURATION_MAX_MINUTES: 24 * 60,
    PEOPLE_MAX: 500,
    /** Used when an occurrence has a start time but the activity no duration. */
    DEFAULT_DURATION_MINUTES: 120,
} as const;

export const IMAGES = {
    QUERY_MIN_LENGTH: 2,
    QUERY_MAX_LENGTH: 80,
    PER_PAGE: 24,
} as const;

export const AVAILABILITY = {
    /** Longest `from..to` range a single availability or occurrences request may ask for. */
    MAX_RANGE_DAYS: 93,
    /** How far ahead date suggestions look. */
    SUGGESTION_WEEKS: 12,
    /** How many suggestions come back; the UI groups them by date. */
    SUGGESTION_LIMIT: 30,
    /** How far ahead calendar events are synced. */
    CALENDAR_SYNC_DAYS: 180,
} as const;

export const AUTH = {
    /** No composition rules: length is what matters, and a long passphrase beats a short mixed one. */
    PASSWORD_MIN_LENGTH: 10,
    PASSWORD_MAX_LENGTH: 128,
    /** How long an emailed verification link stays valid. */
    VERIFY_EMAIL_HOURS: 24,
    /** How long an emailed password reset link stays valid. */
    RESET_PASSWORD_MINUTES: 60,
} as const;

export const GROUP = {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 60,
    DESCRIPTION_MAX_LENGTH: 1000,
    URL_MAX_LENGTH: 500,
    IMAGE_CREDIT_MAX_LENGTH: 80,
    /** Characters in an invite token (32 random bytes, base64url). The link ends with it. */
    INVITE_TOKEN_LENGTH: 43,
} as const;

export const PROFILE = {
    HANDLE_MIN_LENGTH: 3,
    HANDLE_MAX_LENGTH: 24,
    /** Lowercase letters, digits and underscores; checked after lowercasing the input. */
    HANDLE_PATTERN: /^[a-z0-9_]+$/,
    DISPLAY_NAME_MAX_LENGTH: 40,
} as const;

/* -------------------------------------------------------------------------- */
/* Avatars                                                                     */
/*                                                                            */
/* The built-in set. Each key is drawn by the web app as a lucide icon on a   */
/* coloured tile (`apps/web/lib/avatars.ts`); the API only validates that a   */
/* key is in this list.                                                       */
/* -------------------------------------------------------------------------- */

export const AVATAR_KEYS = [
    'bird',
    'bot',
    'bug',
    'cat',
    'dog',
    'fish',
    'ghost',
    'panda',
    'rabbit',
    'rat',
    'rocket',
    'shrimp',
    'snail',
    'squirrel',
    'star',
    'turtle',
    // Second page.
    'monkey',
    'butterfly',
    'ladybird',
    'football',
    'volleyball',
    'beer',
    'wine',
    'pizza',
    'icecream',
    'guitar',
    'gamepad',
    'crown',
    'flame',
    'trophy',
    'mountain',
    'origami',
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

const V1 = '/api/v1';

/**
 * Single source of truth for route paths, shared by the API and the web app.
 *
 * Every path is absolute so route groups mount at the root. Functions take ids
 * so a typo in a path can only happen here. Paths for later milestones are
 * declared now so the map mirrors docs/04-api.md; they are unused until the
 * task that implements them.
 */
export const API_ENDPOINTS = {
    HEALTH: `${V1}/health`,

    AUTH: {
        GOOGLE: `${V1}/auth/google`,
        GOOGLE_CALLBACK: `${V1}/auth/google/callback`,
        REFRESH: `${V1}/auth/refresh`,
        LOGOUT: `${V1}/auth/logout`,
        REGISTER: `${V1}/auth/register`,
        LOGIN: `${V1}/auth/login`,
        VERIFY_EMAIL: `${V1}/auth/verify-email`,
        RESEND_VERIFICATION: `${V1}/auth/resend-verification`,
        FORGOT_PASSWORD: `${V1}/auth/forgot-password`,
        RESET_PASSWORD: `${V1}/auth/reset-password`,
    },

    ME: {
        /** GET profile, PATCH profile, DELETE account. */
        ROOT: `${V1}/me`,
        PASSWORD: `${V1}/me/password`,
        SETUP: (step: string) => `${V1}/me/setup/${step}`,
        AVAILABILITY: `${V1}/me/availability`,
        UNAVAILABILITY: `${V1}/me/unavailability`,
        UNAVAILABILITY_RULES: `${V1}/me/unavailability-rules`,
        UNAVAILABILITY_RULE: (ruleId: string) => `${V1}/me/unavailability-rules/${ruleId}`,
        CALENDAR: `${V1}/me/calendar`,
        CALENDAR_CONNECT: `${V1}/me/calendar/connect`,
        CALENDAR_SOURCE: (sourceId: string) => `${V1}/me/calendar/sources/${sourceId}`,
        CALENDAR_SYNC: `${V1}/me/calendar/sync`,
        CALENDAR_EVENTS: `${V1}/me/calendar/events`,
        CALENDAR_IGNORE_RULES: `${V1}/me/calendar/ignore-rules`,
        CALENDAR_IGNORE_RULE: (ruleId: string) => `${V1}/me/calendar/ignore-rules/${ruleId}`,
        NOTIFICATION_SETTINGS: `${V1}/me/notification-settings`,
        NOTIFICATION_SETTING: (type: string) => `${V1}/me/notification-settings/${type}`,
        PUSH_SUBSCRIPTIONS: `${V1}/me/push-subscriptions`,
    },

    IMAGES: {
        /** Free stock photos for an activity, proxied so the provider key stays on the server. */
        SEARCH: `${V1}/images/search`,
        /** Unsplash asks to be told when a photo is actually used. */
        USED: `${V1}/images/used`,
    },

    USERS: {
        HANDLE_AVAILABLE: `${V1}/users/handle-available`,
        SEARCH: `${V1}/users/search`,
    },

    CALENDAR: {
        GOOGLE_CALLBACK: `${V1}/calendar/google/callback`,
    },

    GROUPS: {
        LIST: `${V1}/groups`,
        CREATE: `${V1}/groups`,
        PUBLIC: `${V1}/groups/public`,
        DETAIL: (groupId: string) => `${V1}/groups/${groupId}`,
        JOIN: (groupId: string) => `${V1}/groups/${groupId}/join`,
        LEAVE: (groupId: string) => `${V1}/groups/${groupId}/leave`,
        TRANSFER_OWNERSHIP: (groupId: string) => `${V1}/groups/${groupId}/transfer-ownership`,
        REGENERATE_INVITE_LINK: (groupId: string) =>
            `${V1}/groups/${groupId}/invite-link/regenerate`,
        MEMBERS: (groupId: string) => `${V1}/groups/${groupId}/members`,
        MEMBER: (groupId: string, userId: string) => `${V1}/groups/${groupId}/members/${userId}`,
        INVITES: (groupId: string) => `${V1}/groups/${groupId}/invites`,
        INVITE: (groupId: string, inviteId: string) =>
            `${V1}/groups/${groupId}/invites/${inviteId}`,
        AVAILABILITY: (groupId: string) => `${V1}/groups/${groupId}/availability`,
        OCCURRENCES: (groupId: string) => `${V1}/groups/${groupId}/occurrences`,
    },

    JOIN: {
        /** GET previews the group behind an invite link, POST joins it. */
        BY_TOKEN: (token: string) => `${V1}/join/${token}`,
    },

    INVITES: {
        /** The signed-in user's pending invites. */
        LIST: `${V1}/invites`,
        ACCEPT: (inviteId: string) => `${V1}/invites/${inviteId}/accept`,
        DECLINE: (inviteId: string) => `${V1}/invites/${inviteId}/decline`,
    },

    ACTIVITIES: {
        LIST: (groupId: string) => `${V1}/groups/${groupId}/activities`,
        CREATE: (groupId: string) => `${V1}/groups/${groupId}/activities`,
        DETAIL: (groupId: string, activityId: string) =>
            `${V1}/groups/${groupId}/activities/${activityId}`,
        /** PUT marks the caller in, DELETE takes them out. */
        INTEREST: (groupId: string, activityId: string) =>
            `${V1}/groups/${groupId}/activities/${activityId}/interest`,
        /** Same for another member; admins only. */
        INTEREST_OF: (groupId: string, activityId: string, userId: string) =>
            `${V1}/groups/${groupId}/activities/${activityId}/interest/${userId}`,
        SUGGESTIONS: (groupId: string, activityId: string) =>
            `${V1}/groups/${groupId}/activities/${activityId}/suggestions`,
        OCCURRENCES: (groupId: string, activityId: string) =>
            `${V1}/groups/${groupId}/activities/${activityId}/occurrences`,
        OCCURRENCE: (groupId: string, activityId: string, occurrenceId: string) =>
            `${V1}/groups/${groupId}/activities/${activityId}/occurrences/${occurrenceId}`,
    },

    OCCURRENCES: {
        /** Signed link from the "add to calendar" email button; no login. */
        ICS: (occurrenceId: string) => `${V1}/occurrences/${occurrenceId}/ics`,
    },

    WIDGETS: {
        LIST: (groupId: string) => `${V1}/groups/${groupId}/widgets`,
        CREATE: (groupId: string) => `${V1}/groups/${groupId}/widgets`,
        ORDER: (groupId: string) => `${V1}/groups/${groupId}/widgets/order`,
        RESTORE_DEFAULTS: (groupId: string) => `${V1}/groups/${groupId}/widgets/restore-defaults`,
        DETAIL: (groupId: string, widgetId: string) =>
            `${V1}/groups/${groupId}/widgets/${widgetId}`,
    },
    LEADERBOARDS: {
        LIST: (groupId: string) => `${V1}/groups/${groupId}/leaderboards`,
        CREATE: (groupId: string) => `${V1}/groups/${groupId}/leaderboards`,
        DETAIL: (groupId: string, leaderboardId: string) =>
            `${V1}/groups/${groupId}/leaderboards/${leaderboardId}`,
        SCORES: (groupId: string, leaderboardId: string) =>
            `${V1}/groups/${groupId}/leaderboards/${leaderboardId}/scores`,
        PERIODS: (groupId: string, leaderboardId: string) =>
            `${V1}/groups/${groupId}/leaderboards/${leaderboardId}/periods`,
        HISTORY: (groupId: string, leaderboardId: string) =>
            `${V1}/groups/${groupId}/leaderboards/${leaderboardId}/history`,
        MEMBERS: (groupId: string, leaderboardId: string) =>
            `${V1}/groups/${groupId}/leaderboards/${leaderboardId}/members`,
        MEMBER: (groupId: string, leaderboardId: string, memberId: string) =>
            `${V1}/groups/${groupId}/leaderboards/${leaderboardId}/members/${memberId}`,
        /** PUT sets, DELETE clears the member's score for the current period. */
        MEMBER_SCORE: (groupId: string, leaderboardId: string, memberId: string) =>
            `${V1}/groups/${groupId}/leaderboards/${leaderboardId}/members/${memberId}/score`,
    },

    /** Cron entry points, called by `tools/worker.ts` with the worker token. */
    WORKER: {
        CALENDAR_SYNC: `${V1}/worker/calendar-sync`,
        CLEANUP: `${V1}/worker/cleanup`,
        OCCURRENCE_REMINDERS: `${V1}/worker/occurrence-reminders`,
    },
} as const;

/* -------------------------------------------------------------------------- */
/* Error codes                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The `code` field of every error response. The web app maps these to
 * translated messages, so a new code needs a translation in both locales.
 */
export const ERROR_CODES = {
    /** No valid access token. */
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    /** Signed in, but this action is not allowed for this role or membership. */
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    /** The request is well formed but conflicts with current state (duplicate handle, already a member). */
    CONFLICT: 'CONFLICT',
    RATE_LIMITED: 'RATE_LIMITED',
    /** Wrong email or password. One code for both, so the response never says which. */
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    /** The account exists but the verification link has not been clicked yet. */
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    /** A verification or reset link that is expired, already used or unknown. */
    TOKEN_INVALID: 'TOKEN_INVALID',
    /** The owner tried to leave or delete their account without transferring first. */
    OWNER_MUST_TRANSFER: 'OWNER_MUST_TRANSFER',
    /** Groups need a handle, name and avatar first; the app sends the person to onboarding. */
    ONBOARDING_REQUIRED: 'ONBOARDING_REQUIRED',
    /** A worker endpoint was called while the same job was still running. */
    WORKER_BUSY: 'WORKER_BUSY',
    /** Google (OAuth or Calendar) or the mail provider failed or timed out. */
    PROVIDER_ERROR: 'PROVIDER_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
