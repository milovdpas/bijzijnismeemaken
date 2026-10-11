import { describe, expect, it, vi } from 'vitest';
import { CalendarEventType, CalendarProviderKey } from '@bzim/types';

import { ProviderError } from '../src/app/infrastructure/modules/calendar/CalendarProvider';
import { CalendarProviderFactory } from '../src/app/infrastructure/modules/calendar/CalendarProviderFactory';
import { FixtureCalendarProvider } from '../src/app/infrastructure/modules/calendar/FixtureCalendarProvider';
import {
    GoogleCalendarProvider,
    mapGoogleEvent,
    toGoogleEvent,
} from '../src/app/infrastructure/modules/calendar/GoogleCalendarProvider';

describe('mapGoogleEvent', () => {
    it('turns a timed event into a UTC window and keeps what availability needs', () => {
        const event = mapGoogleEvent({
            id: 'e1',
            summary: 'Tandarts',
            start: { dateTime: '2026-11-03T09:00:00+01:00' },
            end: { dateTime: '2026-11-03T10:00:00+01:00' },
            recurringEventId: 'series-1',
            transparency: 'transparent',
            eventType: 'default',
        });
        expect(event).toMatchObject({
            id: 'e1',
            title: 'Tandarts',
            recurringEventId: 'series-1',
            allDay: false,
            startDate: null,
            transparent: true,
            eventType: CalendarEventType.DEFAULT,
        });
        expect(event?.startAt.toISOString()).toBe('2026-11-03T08:00:00.000Z');
        expect(event?.endAt.toISOString()).toBe('2026-11-03T09:00:00.000Z');
    });

    it('stores an all-day event as Amsterdam midnight to midnight, dates kept', () => {
        const event = mapGoogleEvent({
            id: 'e2',
            summary: 'Vrij',
            start: { date: '2026-07-10' },
            end: { date: '2026-07-12' },
        });
        expect(event).toMatchObject({
            allDay: true,
            startDate: '2026-07-10',
            endDate: '2026-07-12',
        });
        // Summer: UTC+2.
        expect(event?.startAt.toISOString()).toBe('2026-07-09T22:00:00.000Z');
        expect(event?.endAt.toISOString()).toBe('2026-07-11T22:00:00.000Z');
    });

    it('skips what the sync rules skip and defaults what it does not know', () => {
        const timed = {
            start: { dateTime: '2026-11-03T09:00:00Z' },
            end: { dateTime: '2026-11-03T10:00:00Z' },
        };
        expect(mapGoogleEvent({ id: 'c', status: 'cancelled', ...timed })).toBeNull();
        expect(mapGoogleEvent({ id: 'b', eventType: 'birthday', ...timed })).toBeNull();
        expect(mapGoogleEvent({ id: 'w', eventType: 'workingLocation', ...timed })).toBeNull();
        expect(
            mapGoogleEvent({
                id: 'd',
                attendees: [
                    { self: false, responseStatus: 'declined' },
                    { self: true, responseStatus: 'declined' },
                ],
                ...timed,
            }),
        ).toBeNull();
        expect(
            mapGoogleEvent({
                id: 'a',
                attendees: [{ self: true, responseStatus: 'accepted' }],
                eventType: 'somethingNew',
                ...timed,
            }),
        ).toMatchObject({ title: '', eventType: CalendarEventType.DEFAULT });
        expect(mapGoogleEvent({ id: 'x', start: {}, end: {} })).toBeNull();
    });
});

describe('toGoogleEvent', () => {
    it('writes a timed window or an all-day span', () => {
        expect(
            toGoogleEvent({
                title: 'Klaverjassen',
                description: 'Bij Anna',
                startAt: new Date('2026-11-03T19:00:00.000Z'),
                endAt: new Date('2026-11-03T21:00:00.000Z'),
                startDate: null,
                endDate: null,
            }),
        ).toEqual({
            summary: 'Klaverjassen',
            description: 'Bij Anna',
            start: { dateTime: '2026-11-03T19:00:00.000Z' },
            end: { dateTime: '2026-11-03T21:00:00.000Z' },
        });
        expect(
            toGoogleEvent({
                title: 'Weekend',
                description: '',
                startAt: null,
                endAt: null,
                startDate: '2026-11-07',
                endDate: '2026-11-09',
            }),
        ).toMatchObject({ start: { date: '2026-11-07' }, end: { date: '2026-11-09' } });
    });
});

describe('GoogleCalendarProvider', () => {
    it('builds a connect URL that asks for offline access, consent and the right scopes', () => {
        const url = new URL(new GoogleCalendarProvider().connectUrl('abc', 'readwrite'));
        expect(url.searchParams.get('state')).toBe('abc');
        expect(url.searchParams.get('access_type')).toBe('offline');
        expect(url.searchParams.get('prompt')).toBe('consent');
        expect(url.searchParams.get('include_granted_scopes')).toBe('true');
        expect(url.searchParams.get('scope')).toContain('calendar.events');
        expect(url.searchParams.get('redirect_uri')).toContain('/calendar/google/callback');
        expect(
            new URL(new GoogleCalendarProvider().connectUrl('abc', 'read')).searchParams.get(
                'scope',
            ),
        ).not.toContain('calendar.events');
    });

    it('pages through events and treats a 401 as a dead grant', async () => {
        const provider = new GoogleCalendarProvider();
        const pages = [
            {
                items: [
                    {
                        id: '1',
                        start: { dateTime: '2026-11-03T09:00:00Z' },
                        end: { dateTime: '2026-11-03T10:00:00Z' },
                    },
                    { id: '2', status: 'cancelled' },
                ],
                nextPageToken: 'next',
            },
            { items: [{ id: '3', start: { date: '2026-11-04' }, end: { date: '2026-11-05' } }] },
        ];
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
            const page = pages.shift();
            return Promise.resolve(
                new Response(JSON.stringify(page), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }),
            );
        });
        const events = await provider.listEvents(
            'token',
            'primary',
            new Date('2026-11-01'),
            new Date('2026-12-01'),
        );
        expect(events.map((event) => event.id)).toEqual(['1', '3']);
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(fetchSpy.mock.calls[1]?.[0]).toContain('pageToken=next');

        fetchSpy.mockResolvedValue(new Response('{}', { status: 401 }));
        await expect(provider.listCalendars('token')).rejects.toMatchObject({
            reauthRequired: true,
            status: 401,
        });
        fetchSpy.mockResolvedValue(new Response('{}', { status: 503 }));
        await expect(provider.listCalendars('token')).rejects.toMatchObject({
            reauthRequired: false,
            status: 503,
        });
        fetchSpy.mockRestore();
    });
});

describe('CalendarProviderFactory and the fixture', () => {
    it('hands out Google by key, and the fixture records what it was asked', async () => {
        expect(CalendarProviderFactory.for(CalendarProviderKey.GOOGLE)).toBeInstanceOf(
            GoogleCalendarProvider,
        );

        const fixture = new FixtureCalendarProvider();
        vi.spyOn(CalendarProviderFactory, 'for').mockReturnValue(fixture);
        const provider = CalendarProviderFactory.for(CalendarProviderKey.GOOGLE);
        expect(provider).toBe(fixture);

        const id = await provider.createEvent('t', 'primary', {
            title: 'x',
            description: '',
            startAt: new Date(),
            endAt: new Date(),
            startDate: null,
            endDate: null,
        });
        await provider.deleteEvent('t', 'primary', id);
        expect(fixture.written).toHaveLength(1);
        expect(fixture.deleted).toEqual([{ calendarId: 'primary', eventId: id }]);

        fixture.failWith = 'reauth';
        await expect(provider.listCalendars('t')).rejects.toBeInstanceOf(ProviderError);
        await expect(provider.listCalendars('t')).rejects.toMatchObject({ reauthRequired: true });
        vi.restoreAllMocks();
    });
});
