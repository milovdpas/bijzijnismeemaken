import type { CalendarEventType, CalendarProviderKey } from '@bzim/types';

/** Read-only for availability; read-write once the person turns on auto-add. */
export type CalendarScope = 'read' | 'readwrite';

export interface ExchangedTokens {
    refreshToken: string;
    accessToken: string;
    expiresAt: Date;
    /** The address of the Google account that granted access; may differ from the login. */
    accountEmail: string;
    grantedScopes: string[];
}

export interface ProviderCalendar {
    id: string;
    name: string;
    primary: boolean;
    timeZone: string;
}

/**
 * One event as the availability algorithm needs it (docs/03 `calendar_events`).
 * Already past the sync filters: cancelled, declined, birthday and
 * working-location events never become one of these.
 */
export interface ProviderEvent {
    id: string;
    recurringEventId: string | null;
    title: string;
    startAt: Date;
    endAt: Date;
    allDay: boolean;
    /** Calendar dates for an all-day event, the end exclusive; null for a timed one. */
    startDate: string | null;
    endDate: string | null;
    /** Marked "Free": never blocks. */
    transparent: boolean;
    eventType: CalendarEventType;
}

/** What auto-add writes into somebody's calendar for an occurrence. */
export interface EventInput {
    title: string;
    description: string;
    /** Either a timed window (both instants) or an all-day span (both dates, end exclusive). */
    startAt: Date | null;
    endAt: Date | null;
    startDate: string | null;
    endDate: string | null;
}

/**
 * A provider refusing us. `reauthRequired` means the grant itself is gone
 * (revoked, expired, password changed) and the person has to reconnect;
 * anything else is a passing failure worth retrying tomorrow.
 */
export class ProviderError extends Error {
    constructor(
        message: string,
        readonly reauthRequired: boolean,
        readonly status: number | null = null,
    ) {
        super(message);
        this.name = 'ProviderError';
    }
}

/**
 * The calendar provider abstraction (docs/02 §2.6). Services only ever see
 * this; the Google implementation and the test fixture both satisfy it.
 * Tokens come in as plain strings: the connection entity decrypts them and
 * the service decides when to refresh, so the provider stays free of the
 * database.
 */
export interface CalendarProvider {
    readonly key: CalendarProviderKey;
    /** Where to send the browser; `state` is ours and comes back untouched. */
    connectUrl(state: string, scope: CalendarScope): string;
    exchangeCode(code: string): Promise<ExchangedTokens>;
    refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }>;
    listCalendars(accessToken: string): Promise<ProviderCalendar[]>;
    /** Every instance in the window, recurrences expanded, filtered as docs/03 says. */
    listEvents(
        accessToken: string,
        calendarId: string,
        from: Date,
        to: Date,
    ): Promise<ProviderEvent[]>;
    /** Returns the provider's id of the new event. */
    createEvent(accessToken: string, calendarId: string, input: EventInput): Promise<string>;
    updateEvent(
        accessToken: string,
        calendarId: string,
        eventId: string,
        input: EventInput,
    ): Promise<void>;
    deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void>;
    /** Gives the grant back, so a reconnect starts clean. */
    revoke(refreshToken: string): Promise<void>;
}
