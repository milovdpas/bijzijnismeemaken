import { CalendarProviderKey } from '@bzim/types';

import { ProviderError } from './CalendarProvider';
import type {
    CalendarProvider,
    CalendarScope,
    EventInput,
    ExchangedTokens,
    ProviderCalendar,
    ProviderEvent,
} from './CalendarProvider';

/**
 * The provider the tests talk to: scripted calendars and events in memory,
 * a record of what was written, and switches for the ways Google can fail.
 * Tests install it with `vi.spyOn(CalendarProviderFactory, 'for')`. Every
 * method is async so a scripted failure arrives as a rejection, as the real
 * one's would.
 */
export class FixtureCalendarProvider implements CalendarProvider {
    readonly key = CalendarProviderKey.GOOGLE;

    calendars: ProviderCalendar[] = [
        { id: 'primary', name: 'Agenda', primary: true, timeZone: 'Europe/Amsterdam' },
    ];
    /** Events per calendar id. */
    events = new Map<string, ProviderEvent[]>();
    /** What `createEvent` / `updateEvent` were given, in order. */
    written: { calendarId: string; eventId: string; input: EventInput }[] = [];
    deleted: { calendarId: string; eventId: string }[] = [];
    revoked: string[] = [];
    exchanged: ExchangedTokens = {
        refreshToken: 'fixture-refresh',
        accessToken: 'fixture-access',
        expiresAt: new Date(Date.now() + 3_600_000),
        accountEmail: 'agenda@example.test',
        grantedScopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    };
    /** Set to make every call fail: `reauth` as a dead grant, `error` as a passing failure. */
    failWith: 'reauth' | 'error' | null = null;
    refreshes = 0;
    private nextId = 1;

    connectUrl(state: string, scope: CalendarScope): string {
        return `https://accounts.example.test/auth?state=${state}&scope=${scope}`;
    }

    async exchangeCode(code: string): Promise<ExchangedTokens> {
        await this.check();
        if (code === 'bad-code') throw new ProviderError('invalid_grant', false);
        return this.exchanged;
    }

    async refreshAccessToken(): Promise<{ accessToken: string; expiresAt: Date }> {
        await this.check();
        this.refreshes += 1;
        return {
            accessToken: `fixture-access-${String(this.refreshes)}`,
            expiresAt: new Date(Date.now() + 3_600_000),
        };
    }

    async listCalendars(): Promise<ProviderCalendar[]> {
        await this.check();
        return [...this.calendars];
    }

    async listEvents(
        _accessToken: string,
        calendarId: string,
        from: Date,
        to: Date,
    ): Promise<ProviderEvent[]> {
        await this.check();
        return (this.events.get(calendarId) ?? []).filter(
            (event) => event.startAt < to && event.endAt > from,
        );
    }

    async createEvent(
        _accessToken: string,
        calendarId: string,
        input: EventInput,
    ): Promise<string> {
        await this.check();
        const eventId = `fixture-event-${String(this.nextId)}`;
        this.nextId += 1;
        this.written.push({ calendarId, eventId, input });
        return eventId;
    }

    async updateEvent(
        _accessToken: string,
        calendarId: string,
        eventId: string,
        input: EventInput,
    ): Promise<void> {
        await this.check();
        this.written.push({ calendarId, eventId, input });
    }

    async deleteEvent(_accessToken: string, calendarId: string, eventId: string): Promise<void> {
        await this.check();
        this.deleted.push({ calendarId, eventId });
    }

    async revoke(refreshToken: string): Promise<void> {
        await Promise.resolve();
        this.revoked.push(refreshToken);
    }

    private async check(): Promise<void> {
        await Promise.resolve();
        if (this.failWith === 'reauth') throw new ProviderError('invalid_grant', true, 401);
        if (this.failWith === 'error') throw new ProviderError('backend error', false, 503);
    }
}
