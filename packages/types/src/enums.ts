/**
 * String enums are stored as-is in VARCHAR columns and sent as-is over the
 * API, so a value here is also a database value and a wire value. Renaming one
 * is a migration.
 */

/** The three fixed parts of a day availability is tracked in. Ranges live in `DAYPARTS`. */
export enum Daypart {
    MORNING = 'morning',
    AFTERNOON = 'afternoon',
    EVENING = 'evening',
}

/**
 * ISO-8601 weekday numbering, matching Luxon's `weekday`.
 *
 * Deliberately not JavaScript's `Date.getDay()` (Sunday = 0): the API computes
 * everything with Luxon, and the week starts on Monday in every screen.
 */
export enum Weekday {
    MONDAY = 1,
    TUESDAY = 2,
    WEDNESDAY = 3,
    THURSDAY = 4,
    FRIDAY = 5,
    SATURDAY = 6,
    SUNDAY = 7,
}

export enum Locale {
    NL = 'nl',
    EN = 'en',
}

/** Who can find and join a group. */
export enum GroupAccess {
    /** Listed in the public overview; anyone signed in can join. */
    PUBLIC = 'public',
    /** Not listed; anyone holding the non-expiring invite link can join. */
    INVITE_LINK = 'invite_link',
    /** Not listed; members are invited by handle and must accept. */
    INVITE_ONLY = 'invite_only',
}

export enum GroupRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
}

/** How an activity's date field is to be read. */
/**
 * What kind of thing an activity is. One column, used for the icon, the filter
 * and which optional fields the form suggests; never for separate schemas.
 */
export enum ActivityCategory {
    EVENT = 'event',
    HOME = 'home',
    OUTDOORS = 'outdoors',
    SPORTS = 'sports',
    FOOD_AND_DRINKS = 'food_and_drinks',
    TRIP = 'trip',
    OTHER = 'other',
}

export enum DateMode {
    /** No date preference. */
    NONE = 'none',
    /** One specific calendar date. */
    SPECIFIC = 'specific',
    /** Any date on a given weekday; recurring activities use this. */
    WEEKDAY = 'weekday',
}

/**
 * Derived, never stored: computed from an activity's occurrences.
 *
 * `done` only applies to non-recurring activities; a recurring one is
 * `planned` while an occurrence is open and `idea` in between.
 */
export enum ActivityLabel {
    IDEA = 'idea',
    PLANNED = 'planned',
    DONE = 'done',
}

export enum OccurrenceStatus {
    PLANNED = 'planned',
    DONE = 'done',
    CANCELLED = 'cancelled',
}

export enum ScoreType {
    /** A plain number, up to three decimals. */
    NUMBER = 'number',
    /** A duration, stored as whole milliseconds. */
    TIME = 'time',
}

/** Ranking direction of a leaderboard: `desc` = highest first, `asc` = lowest first. */
export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

/** Who may set scores on a leaderboard, besides the group owner and admins. */
export enum EditMode {
    EVERYONE = 'everyone',
    CREATOR = 'creator',
    SELECTED = 'selected',
}

export enum LeaderboardPeriod {
    MONTHLY = 'monthly',
    YEARLY = 'yearly',
    TOTAL = 'total',
}

export enum NotificationType {
    GROUP_INVITE = 'group_invite',
    ACTIVITY_CREATED = 'activity_created',
    ACTIVITY_PLANNED = 'activity_planned',
    ACTIVITY_RESCHEDULED = 'activity_rescheduled',
    ACTIVITY_CANCELLED = 'activity_cancelled',
}

/** How a notification reaches someone. Each type can be switched per channel. Push lands in phase 3. */
export enum NotificationChannel {
    EMAIL = 'email',
    PUSH = 'push',
}

/** Calendar providers behind the provider abstraction. Google is the only one implemented. */
export enum CalendarProviderKey {
    GOOGLE = 'google',
}

export enum CalendarConnectionStatus {
    ACTIVE = 'active',
    /** The refresh token was revoked or expired; the user has to reconnect. */
    REAUTH_REQUIRED = 'reauth_required',
    /** The last sync failed for another reason; details in the connection. */
    ERROR = 'error',
}

/** The tiles a group dashboard can show (docs/01 §1.5b). */
export enum WidgetType {
    /** Planned occurrences in the next weeks. */
    UPCOMING = 'upcoming',
    /** Activities without a date, by interest. */
    IDEAS = 'ideas',
    /** The top of one leaderboard period. */
    LEADERBOARD = 'leaderboard',
    /** Pinned text. */
    NOTE = 'note',
    /** One activity in the spotlight. */
    ACTIVITY = 'activity',
    /** An external link with a label. */
    LINK = 'link',
}

/** How an ignore rule matches synced events (docs/06). */
export enum CalendarIgnoreRuleKind {
    /** Every event with this title, case-insensitively. */
    TITLE = 'title',
    /** Every instance of this recurring series. */
    SERIES = 'series',
}

/** Google's event types, as synced. Birthdays and working locations are skipped at sync. */
export enum CalendarEventType {
    DEFAULT = 'default',
    OUT_OF_OFFICE = 'outOfOffice',
    FOCUS_TIME = 'focusTime',
    WORKING_LOCATION = 'workingLocation',
    BIRTHDAY = 'birthday',
}
