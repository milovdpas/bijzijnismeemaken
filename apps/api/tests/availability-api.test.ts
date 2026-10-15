import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, CalendarEventType, Daypart, Weekday } from '@bzim/types';
import type {
    GroupAvailabilityResponse,
    MyAvailabilityResponse,
    UnavailabilityDto,
    UnavailabilityRuleDto,
} from '@bzim/types';

import CalendarEvent from '../src/app/domain/models/CalendarEvent.entity';
import ManualUnavailability from '../src/app/domain/models/ManualUnavailability.entity';
import WeeklyUnavailabilityRule from '../src/app/domain/models/WeeklyUnavailabilityRule.entity';
import { AvailabilityService } from '../src/app/domain/services/AvailabilityService';
import { sessionFor } from './support/auth';
import { asUser, data, error } from './support/client';
import {
    seedActivity,
    seedBlock,
    seedCalendarConnection,
    seedCalendarSource,
    seedGroup,
    seedInterest,
    seedMember,
    seedRule,
    seedUser,
} from './support/factories';

// 2026-11-02 is a Monday; 2026-11-08 a Sunday.
const WEEK = { from: '2026-11-02', to: '2026-11-08' };

describe('AvailabilityService.matrix', () => {
    it('marks one-off blocks and weekly rules inside their validity, nothing else', async () => {
        const user = await seedUser();
        await seedBlock(user, '2026-11-03', Daypart.EVENING);
        await seedRule(user, Weekday.WEDNESDAY, Daypart.MORNING);
        await seedRule(user, Weekday.FRIDAY, Daypart.AFTERNOON, { validUntil: '2026-11-05' });
        await seedRule(user, Weekday.SATURDAY, Daypart.AFTERNOON, { validFrom: '2026-11-07' });
        // Somebody else's block never leaks in.
        await seedBlock(await seedUser(), '2026-11-03', Daypart.MORNING);

        const matrix = await AvailabilityService.matrix([user.id], WEEK.from, WEEK.to);
        const mine = matrix.get(user.id);

        expect(mine?.get('2026-11-03')?.get(Daypart.EVENING)).toBe('manual');
        expect(mine?.get('2026-11-03')?.get(Daypart.MORNING)).toBeUndefined();
        expect(mine?.get('2026-11-04')?.get(Daypart.MORNING)).toBe('rule');
        expect(mine?.get('2026-11-06')?.get(Daypart.AFTERNOON)).toBeUndefined();
        expect(mine?.get('2026-11-07')?.get(Daypart.AFTERNOON)).toBe('rule');
    });

    it('lets a one-off block name the reason when a rule says the same', async () => {
        const user = await seedUser();
        await seedRule(user, Weekday.TUESDAY, Daypart.EVENING);
        await seedBlock(user, '2026-11-03', Daypart.EVENING);
        const matrix = await AvailabilityService.matrix([user.id], WEEK.from, WEEK.to);
        expect(matrix.get(user.id)?.get('2026-11-03')?.get(Daypart.EVENING)).toBe('manual');
    });
});

describe('GET /me/availability', () => {
    it('answers every day with reasons for the caller', async () => {
        const user = await seedUser();
        await seedBlock(user, '2026-11-03', Daypart.EVENING);
        const client = asUser((await sessionFor(user)).accessToken);

        const response = await client.get(
            `${API_ENDPOINTS.ME.AVAILABILITY}?from=${WEEK.from}&to=${WEEK.to}`,
        );
        expect(response.status).toBe(200);
        const body = data<MyAvailabilityResponse>(response);
        expect(body.days).toHaveLength(7);
        expect(body.days[1]?.date).toBe('2026-11-03');
        expect(body.days[1]?.dayparts).toEqual({
            morning: null,
            afternoon: null,
            evening: 'manual',
        });

        expect(
            (await client.get(`${API_ENDPOINTS.ME.AVAILABILITY}?from=2026-11-08&to=2026-11-02`))
                .status,
        ).toBe(422);
    });
});

describe('/me/unavailability', () => {
    it('adds, lists in range, and removes blocks; adding twice is harmless', async () => {
        const user = await seedUser();
        const client = asUser((await sessionFor(user)).accessToken);
        const block = { date: '2026-11-03', daypart: Daypart.EVENING };

        expect((await client.put(API_ENDPOINTS.ME.UNAVAILABILITY, block)).status).toBe(204);
        expect((await client.put(API_ENDPOINTS.ME.UNAVAILABILITY, block)).status).toBe(204);
        expect(await ManualUnavailability.count()).toBe(1);

        const listed = data<UnavailabilityDto[]>(
            await client.get(`${API_ENDPOINTS.ME.UNAVAILABILITY}?from=${WEEK.from}&to=${WEEK.to}`),
        );
        expect(listed).toEqual([{ ...block, free: false }]);
        const outside = data<UnavailabilityDto[]>(
            await client.get(`${API_ENDPOINTS.ME.UNAVAILABILITY}?from=2026-12-01&to=2026-12-07`),
        );
        expect(outside).toEqual([]);

        expect((await client.delete(API_ENDPOINTS.ME.UNAVAILABILITY, block)).status).toBe(204);
        expect(await ManualUnavailability.count()).toBe(0);
        expect((await client.put(API_ENDPOINTS.ME.UNAVAILABILITY, { date: 'soon' })).status).toBe(
            422,
        );
    });

    it('frees a daypart from a weekly rule for one date, and the rule holds again once removed', async () => {
        const user = await seedUser();
        const group = await seedGroup(user);
        const client = asUser((await sessionFor(user)).accessToken);
        // Work every Monday and Tuesday morning; a day off on Monday the 2nd.
        await seedRule(user, Weekday.MONDAY, Daypart.MORNING);
        await seedRule(user, Weekday.TUESDAY, Daypart.MORNING);
        const dayOff = { date: '2026-11-02', daypart: Daypart.MORNING, free: true };
        expect((await client.put(API_ENDPOINTS.ME.UNAVAILABILITY, dayOff)).status).toBe(204);

        const mine = () =>
            client.get(`${API_ENDPOINTS.ME.AVAILABILITY}?from=${WEEK.from}&to=${WEEK.to}`);
        const day = async (date: string) =>
            data<MyAvailabilityResponse>(await mine()).days.find((entry) => entry.date === date);
        expect(await day('2026-11-02')).toMatchObject({
            dayparts: { [Daypart.MORNING]: null },
            freed: { [Daypart.MORNING]: true, [Daypart.AFTERNOON]: false },
        });
        expect(await day('2026-11-03')).toMatchObject({
            dayparts: { [Daypart.MORNING]: 'rule' },
            freed: { [Daypart.MORNING]: false },
        });

        // The group sees that Monday morning free, and the Tuesday busy.
        const groupDays = data<GroupAvailabilityResponse>(
            await client.get(
                `${API_ENDPOINTS.GROUPS.AVAILABILITY(group.id)}?from=${WEEK.from}&to=${WEEK.to}`,
            ),
        ).days;
        const busyOn = (date: string) =>
            groupDays.find((entry) => entry.date === date)?.dayparts[Daypart.MORNING].busy;
        expect(busyOn('2026-11-02')).toEqual([]);
        expect(busyOn('2026-11-03')).toEqual([user.id]);

        // Blocking it instead replaces the free day; removing it brings the rule back.
        await client.put(API_ENDPOINTS.ME.UNAVAILABILITY, { ...dayOff, free: false });
        expect(await ManualUnavailability.count()).toBe(1);
        expect((await day('2026-11-02'))?.dayparts[Daypart.MORNING]).toBe('manual');
        await client.put(API_ENDPOINTS.ME.UNAVAILABILITY, dayOff);
        expect((await client.delete(API_ENDPOINTS.ME.UNAVAILABILITY, dayOff)).status).toBe(204);
        expect(await day('2026-11-02')).toMatchObject({
            dayparts: { [Daypart.MORNING]: 'rule' },
            freed: { [Daypart.MORNING]: false },
        });

        // Nothing to free where no weekly rule makes the daypart busy.
        const wednesday = await client.put(API_ENDPOINTS.ME.UNAVAILABILITY, {
            date: '2026-11-04',
            daypart: Daypart.MORNING,
            free: true,
        });
        expect(wednesday.status).toBe(409);
        expect(error(wednesday).details).toEqual({ problem: 'NO_RULE' });

        // Two taps that arrive at once: both answered, one row.
        const both = await Promise.all([
            client.put(API_ENDPOINTS.ME.UNAVAILABILITY, dayOff),
            client.put(API_ENDPOINTS.ME.UNAVAILABILITY, dayOff),
        ]);
        expect(both.map((response) => response.status)).toEqual([204, 204]);
        expect(await ManualUnavailability.countBy({ userId: user.id })).toBe(1);
    });

    it('lets the calendar count on a freed daypart, and drops a freed day with its last rule', async () => {
        const user = await seedUser();
        const client = asUser((await sessionFor(user)).accessToken);
        const monday = await seedRule(user, Weekday.MONDAY, Daypart.MORNING);
        await seedBlock(user, '2026-11-02', Daypart.MORNING, true);
        await seedBlock(user, '2026-11-02', Daypart.EVENING);
        // A dentist at ten that Monday: the day off from work does not cover it.
        const source = await seedCalendarSource(await seedCalendarConnection(user));
        await CalendarEvent.create({
            userId: user.id,
            sourceId: source.id,
            feedId: null,
            providerEventId: 'dentist',
            recurringEventId: null,
            title: 'Tandarts',
            startAt: new Date('2026-11-02T09:00:00Z'),
            endAt: new Date('2026-11-02T10:00:00Z'),
            allDay: false,
            startDate: null,
            endDate: null,
            transparent: false,
            eventType: CalendarEventType.DEFAULT,
            syncedAt: new Date(),
        }).save();
        const matrix = await AvailabilityService.matrix([user.id], WEEK.from, WEEK.to);
        expect(matrix.get(user.id)?.get('2026-11-02')?.get(Daypart.MORNING)).toBe('calendar');

        // Without the Monday rule the freed day means nothing, and a new rule starts clean.
        expect((await client.delete(API_ENDPOINTS.ME.UNAVAILABILITY_RULE(monday.id))).status).toBe(
            204,
        );
        expect(await ManualUnavailability.findBy({ userId: user.id })).toMatchObject([
            { daypart: Daypart.EVENING, free: false },
        ]);
        await seedRule(user, Weekday.MONDAY, Daypart.MORNING);
        await CalendarEvent.delete({ userId: user.id });
        const again = await AvailabilityService.matrix([user.id], WEEK.from, WEEK.to);
        expect(again.get(user.id)?.get('2026-11-02')?.get(Daypart.MORNING)).toBe('rule');
    });
});

describe('/me/unavailability-rules', () => {
    it("creates, lists, updates and deletes the caller's own rules", async () => {
        const user = await seedUser();
        const client = asUser((await sessionFor(user)).accessToken);
        const stranger = asUser((await sessionFor(await seedUser())).accessToken);

        const created = await client.post(API_ENDPOINTS.ME.UNAVAILABILITY_RULES, {
            weekday: Weekday.TUESDAY,
            daypart: Daypart.EVENING,
            validUntil: '2026-12-31',
        });
        expect(created.status).toBe(201);
        const rule = data<UnavailabilityRuleDto>(created);
        expect(rule).toMatchObject({
            weekday: 2,
            daypart: 'evening',
            validFrom: null,
            validUntil: '2026-12-31',
        });

        expect(
            data<UnavailabilityRuleDto[]>(await client.get(API_ENDPOINTS.ME.UNAVAILABILITY_RULES)),
        ).toEqual([rule]);
        expect(
            data<UnavailabilityRuleDto[]>(
                await stranger.get(API_ENDPOINTS.ME.UNAVAILABILITY_RULES),
            ),
        ).toEqual([]);

        const bad = await client.post(API_ENDPOINTS.ME.UNAVAILABILITY_RULES, {
            weekday: 8,
            daypart: Daypart.EVENING,
        });
        expect(bad.status).toBe(422);
        const inverted = await client.post(API_ENDPOINTS.ME.UNAVAILABILITY_RULES, {
            weekday: 1,
            daypart: Daypart.EVENING,
            validFrom: '2026-12-31',
            validUntil: '2026-01-01',
        });
        expect(inverted.status).toBe(422);

        const url = API_ENDPOINTS.ME.UNAVAILABILITY_RULE(rule.id);
        expect((await stranger.patch(url, { daypart: Daypart.MORNING })).status).toBe(404);
        const updated = await client.patch(url, { daypart: Daypart.MORNING, validUntil: null });
        expect(updated.status).toBe(200);
        expect(data<UnavailabilityRuleDto>(updated)).toMatchObject({
            daypart: 'morning',
            validUntil: null,
        });

        expect((await stranger.delete(url)).status).toBe(404);
        expect((await client.delete(url)).status).toBe(204);
        expect(await WeeklyUnavailabilityRule.count()).toBe(0);
    });
});

describe('GET /groups/:groupId/availability', () => {
    it('shows who is busy per daypart, without reasons, for the group or for an activity', async () => {
        const owner = await seedUser({ displayName: 'Milo' });
        const group = await seedGroup(owner);
        const anna = await seedUser({ displayName: 'Anna' });
        await seedMember(group, anna);
        const bob = await seedUser({ displayName: 'Bob' });
        await seedMember(group, bob);
        await seedBlock(anna, '2026-11-03', Daypart.EVENING);
        await seedRule(bob, Weekday.TUESDAY, Daypart.EVENING);
        const activity = await seedActivity(group, owner);
        await seedInterest(activity, anna);
        const client = asUser((await sessionFor(owner)).accessToken);
        const url = API_ENDPOINTS.GROUPS.AVAILABILITY(group.id);

        const whole = data<GroupAvailabilityResponse>(
            await client.get(`${url}?from=${WEEK.from}&to=${WEEK.to}`),
        );
        expect(whole.users.map((entry) => entry.user.displayName)).toEqual(['Anna', 'Bob', 'Milo']);
        expect(whole.users.every((entry) => !entry.hasCalendar)).toBe(true);
        const tuesday = whole.days.find((day) => day.date === '2026-11-03');
        expect(tuesday?.dayparts.evening.busy.sort()).toEqual([anna.id, bob.id].sort());
        expect(tuesday?.dayparts.morning.busy).toEqual([]);
        expect(JSON.stringify(whole)).not.toContain('manual');

        const forActivity = data<GroupAvailabilityResponse>(
            await client.get(`${url}?from=${WEEK.from}&to=${WEEK.to}&activityId=${activity.id}`),
        );
        expect(forActivity.users.map((entry) => entry.user.id)).toEqual([anna.id]);
        expect(
            forActivity.days.find((day) => day.date === '2026-11-03')?.dayparts.evening.busy,
        ).toEqual([anna.id]);

        const otherGroup = await seedGroup(owner);
        const foreign = await seedActivity(otherGroup, owner);
        expect(
            (await client.get(`${url}?from=${WEEK.from}&to=${WEEK.to}&activityId=${foreign.id}`))
                .status,
        ).toBe(404);
        const outsider = asUser((await sessionFor(await seedUser())).accessToken);
        expect((await outsider.get(`${url}?from=${WEEK.from}&to=${WEEK.to}`)).status).toBe(404);
    });
});
