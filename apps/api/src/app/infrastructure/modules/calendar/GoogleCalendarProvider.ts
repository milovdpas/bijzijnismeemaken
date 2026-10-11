import { OAuth2Client } from 'google-auth-library';
import { DateTime } from 'luxon';
import { API_ENDPOINTS, CalendarEventType, CalendarProviderKey, TIME_ZONE } from '@bzim/types';

import { env } from '../../../../config/app';
import { ProviderError } from './CalendarProvider';
import type {
    CalendarProvider,
    CalendarScope,
    EventInput,
    ExchangedTokens,
    ProviderCalendar,
    ProviderEvent,
} from './CalendarProvider';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const READ_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
/** Google pages at 250 by default; the maximum spares a round trip per busy calendar. */
const PAGE_SIZE = 2500;
const TIMEOUT_MS = 15_000;

/** The parts of Google's event resource this app reads. */
export interface GoogleEvent {
    id: string;
    status?: string;
    summary?: string;
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string };
    recurringEventId?: string;
    transparency?: string;
    eventType?: string;
    attendees?: { self?: boolean; responseStatus?: string }[];
}

interface GoogleCalendarListEntry {
    id: string;
    summary?: string;
    summaryOverride?: string;
    primary?: boolean;
    timeZone?: string;
}

const EVENT_TYPES = new Set<string>(Object.values(CalendarEventType));
const SKIPPED_TYPES = new Set<string>([
    CalendarEventType.BIRTHDAY,
    CalendarEventType.WORKING_LOCATION,
]);

/**
 * One Google event as the sync stores it, or null when the sync skips it
 * (docs/03): cancelled, declined by this person, a birthday or a working
 * location. All-day events become Amsterdam midnight to midnight in UTC so
 * every event is one window on the same clock. Pure, so it is tested with
 * JSON rather than with Google.
 */
export function mapGoogleEvent(raw: GoogleEvent): ProviderEvent | null {
    if (raw.status === 'cancelled') return null;
    if (raw.eventType !== undefined && SKIPPED_TYPES.has(raw.eventType)) return null;
    if (
        raw.attendees?.some((guest) => guest.self === true && guest.responseStatus === 'declined')
    ) {
        return null;
    }
    const base = {
        id: raw.id,
        recurringEventId: raw.recurringEventId ?? null,
        title: raw.summary ?? '',
        transparent: raw.transparency === 'transparent',
        eventType:
            raw.eventType !== undefined && EVENT_TYPES.has(raw.eventType)
                ? (raw.eventType as CalendarEventType)
                : CalendarEventType.DEFAULT,
    };
    if (raw.start?.date !== undefined && raw.end?.date !== undefined) {
        return {
            ...base,
            allDay: true,
            startDate: raw.start.date,
            endDate: raw.end.date,
            startAt: DateTime.fromISO(raw.start.date, { zone: TIME_ZONE }).toUTC().toJSDate(),
            endAt: DateTime.fromISO(raw.end.date, { zone: TIME_ZONE }).toUTC().toJSDate(),
        };
    }
    if (raw.start?.dateTime !== undefined && raw.end?.dateTime !== undefined) {
        return {
            ...base,
            allDay: false,
            startDate: null,
            endDate: null,
            startAt: DateTime.fromISO(raw.start.dateTime).toUTC().toJSDate(),
            endAt: DateTime.fromISO(raw.end.dateTime).toUTC().toJSDate(),
        };
    }
    return null;
}

/** An event input as Google's resource. */
export function toGoogleEvent(input: EventInput): Record<string, unknown> {
    const when =
        input.startDate !== null && input.endDate !== null
            ? { start: { date: input.startDate }, end: { date: input.endDate } }
            : {
                  start: { dateTime: input.startAt?.toISOString() ?? '' },
                  end: { dateTime: input.endAt?.toISOString() ?? '' },
              };
    return { summary: input.title, description: input.description, ...when };
}

/**
 * Google Calendar over its REST API, with `google-auth-library` for the
 * OAuth part (already here for sign-in; `googleapis` would add a lot of
 * client for four endpoints). One instance, no state.
 */
export class GoogleCalendarProvider implements CalendarProvider {
    readonly key = CalendarProviderKey.GOOGLE;

    connectUrl(state: string, scope: CalendarScope): string {
        return this.client().generateAuthUrl({
            scope: ['openid', 'email', READ_SCOPE, ...(scope === 'readwrite' ? [WRITE_SCOPE] : [])],
            state,
            // Offline with consent forced: the only way Google hands out a refresh
            // token every time, and the incremental write scope needs the earlier
            // grant included.
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: true,
        });
    }

    async exchangeCode(code: string): Promise<ExchangedTokens> {
        const client = this.client();
        const { tokens } = await client.getToken(code);
        if (tokens.refresh_token === undefined || tokens.refresh_token === null) {
            throw new ProviderError('Google returned no refresh token', false);
        }
        if (tokens.access_token === undefined || tokens.access_token === null) {
            throw new ProviderError('Google returned no access token', false);
        }
        if (tokens.id_token === undefined || tokens.id_token === null) {
            throw new ProviderError('Google returned no id_token', false);
        }
        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: env.google.clientId(),
        });
        const email = ticket.getPayload()?.email;
        if (email === undefined) {
            throw new ProviderError('Google id_token carries no email', false);
        }
        return {
            refreshToken: tokens.refresh_token,
            accessToken: tokens.access_token,
            expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3_600_000),
            accountEmail: email,
            grantedScopes: (tokens.scope ?? '').split(' ').filter((entry) => entry !== ''),
        };
    }

    async refreshAccessToken(
        refreshToken: string,
    ): Promise<{ accessToken: string; expiresAt: Date }> {
        const client = this.client();
        client.setCredentials({ refresh_token: refreshToken });
        try {
            const { credentials } = await client.refreshAccessToken();
            if (credentials.access_token === undefined || credentials.access_token === null) {
                throw new ProviderError('Google returned no access token', false);
            }
            return {
                accessToken: credentials.access_token,
                expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3_600_000),
            };
        } catch (error) {
            if (error instanceof ProviderError) throw error;
            const message = error instanceof Error ? error.message : String(error);
            // invalid_grant is Google for "that refresh token is dead".
            throw new ProviderError(message, /invalid_grant/i.test(message));
        }
    }

    async listCalendars(accessToken: string): Promise<ProviderCalendar[]> {
        const body = await this.get<{ items?: GoogleCalendarListEntry[] }>(
            accessToken,
            '/users/me/calendarList',
            { minAccessRole: 'reader' },
        );
        return (body.items ?? []).map((entry) => ({
            id: entry.id,
            name: entry.summaryOverride ?? entry.summary ?? entry.id,
            primary: entry.primary === true,
            timeZone: entry.timeZone ?? TIME_ZONE,
        }));
    }

    async listEvents(
        accessToken: string,
        calendarId: string,
        from: Date,
        to: Date,
    ): Promise<ProviderEvent[]> {
        const events: ProviderEvent[] = [];
        let pageToken: string | undefined;
        do {
            const body = await this.get<{ items?: GoogleEvent[]; nextPageToken?: string }>(
                accessToken,
                `/calendars/${encodeURIComponent(calendarId)}/events`,
                {
                    singleEvents: 'true',
                    orderBy: 'startTime',
                    timeMin: from.toISOString(),
                    timeMax: to.toISOString(),
                    maxResults: String(PAGE_SIZE),
                    ...(pageToken === undefined ? {} : { pageToken }),
                },
            );
            for (const raw of body.items ?? []) {
                const mapped = mapGoogleEvent(raw);
                if (mapped !== null) events.push(mapped);
            }
            pageToken = body.nextPageToken;
        } while (pageToken !== undefined);
        return events;
    }

    async createEvent(accessToken: string, calendarId: string, input: EventInput): Promise<string> {
        const body = await this.send<{ id: string }>(
            accessToken,
            'POST',
            `/calendars/${encodeURIComponent(calendarId)}/events`,
            toGoogleEvent(input),
        );
        return body.id;
    }

    async updateEvent(
        accessToken: string,
        calendarId: string,
        eventId: string,
        input: EventInput,
    ): Promise<void> {
        await this.send(
            accessToken,
            'PATCH',
            `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            toGoogleEvent(input),
        );
    }

    async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
        await this.send(
            accessToken,
            'DELETE',
            `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            null,
            // Already gone is the outcome we wanted.
            [404, 410],
        );
    }

    async revoke(refreshToken: string): Promise<void> {
        try {
            await this.client().revokeToken(refreshToken);
        } catch (error) {
            // A token Google no longer knows is as revoked as it gets.
            const message = error instanceof Error ? error.message : String(error);
            if (!/invalid_token|400/i.test(message)) {
                throw new ProviderError(message, false);
            }
        }
    }

    private client(): OAuth2Client {
        return new OAuth2Client({
            clientId: env.google.clientId(),
            clientSecret: env.google.clientSecret(),
            redirectUri: `${env.apiUrl}${API_ENDPOINTS.CALENDAR.GOOGLE_CALLBACK}`,
        });
    }

    private get<T>(accessToken: string, path: string, query: Record<string, string>): Promise<T> {
        return this.send<T>(
            accessToken,
            'GET',
            `${path}?${new URLSearchParams(query).toString()}`,
            null,
        );
    }

    /** One call to the REST API; a 401 means the grant is gone, anything else failing is passing. */
    private async send<T>(
        accessToken: string,
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
        path: string,
        body: Record<string, unknown> | null,
        acceptable: number[] = [],
    ): Promise<T> {
        const response = await fetch(`${CALENDAR_API}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...(body === null ? {} : { 'Content-Type': 'application/json' }),
            },
            body: body === null ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok && !acceptable.includes(response.status)) {
            throw new ProviderError(
                `Google Calendar answered ${String(response.status)} for ${method} ${path}`,
                response.status === 401,
                response.status,
            );
        }
        if (response.status === 204 || acceptable.includes(response.status)) {
            return undefined as T;
        }
        return (await response.json()) as T;
    }
}
