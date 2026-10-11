import { DateTime } from 'luxon';
import {
    Between,
    In,
    IsNull,
    LessThan,
    LessThanOrEqual,
    MoreThan,
    MoreThanOrEqual,
    Not,
} from 'typeorm';
import { CalendarConnectionStatus, CalendarIgnoreRuleKind, TIME_ZONE } from '@bzim/types';
import type {
    AvailabilityReason,
    Daypart,
    GroupAvailabilityResponse,
    IsoDateString,
    MyAvailabilityResponse,
    Weekday,
} from '@bzim/types';

import ActivityInterest from '../models/ActivityInterest.entity';
import CalendarConnection from '../models/CalendarConnection.entity';
import CalendarEvent from '../models/CalendarEvent.entity';
import CalendarIgnoreRule from '../models/CalendarIgnoreRule.entity';
import type Group from '../models/Group.entity';
import GroupMember from '../models/GroupMember.entity';
import ManualUnavailability from '../models/ManualUnavailability.entity';
import type User from '../models/User.entity';
import WeeklyUnavailabilityRule from '../models/WeeklyUnavailabilityRule.entity';
import AvailabilityPresenter from '../presenters/AvailabilityPresenter';
import { eachDay, weekdayOf } from '../utils/Dates';
import { eventCells } from '../utils/EventCells';

/** user → date → daypart → why busy, or absent when free. */
export type AvailabilityMatrix = Map<string, Map<IsoDateString, Map<Daypart, AvailabilityReason>>>;

/**
 * Who is free when: what people said about their own time, and what their
 * synced calendar says (docs/06). Three sources feed one matrix; a one-off
 * block wins over a rule, and both over the calendar, for the reason shown.
 *
 * Reasons stay inside the API except for the person themselves: a group
 * only ever learns busy or free.
 */
export class AvailabilityService {
    /**
     * Three queries for any number of people and days, then pure bookkeeping.
     * A one-off block wins over a rule for the reason shown, since it is the
     * more deliberate statement; both mean busy.
     */
    static async matrix(
        userIds: string[],
        from: IsoDateString,
        to: IsoDateString,
    ): Promise<AvailabilityMatrix> {
        const matrix: AvailabilityMatrix = new Map(
            userIds.map((id) => [id, new Map<IsoDateString, Map<Daypart, AvailabilityReason>>()]),
        );
        if (userIds.length === 0) {
            return matrix;
        }
        const windowStart = DateTime.fromISO(from, { zone: TIME_ZONE })
            .startOf('day')
            .toUTC()
            .toJSDate();
        const windowEnd = DateTime.fromISO(to, { zone: TIME_ZONE }).endOf('day').toUTC().toJSDate();
        const [blocks, rules, events, ignores] = await Promise.all([
            ManualUnavailability.findBy({ userId: In(userIds), date: Between(from, to) }),
            // Only rules whose validity overlaps the window; an expired course never reaches the loop.
            WeeklyUnavailabilityRule.find({
                where: [
                    { userId: In(userIds), validFrom: IsNull(), validUntil: IsNull() },
                    { userId: In(userIds), validFrom: IsNull(), validUntil: MoreThanOrEqual(from) },
                    { userId: In(userIds), validFrom: LessThanOrEqual(to), validUntil: IsNull() },
                    {
                        userId: In(userIds),
                        validFrom: LessThanOrEqual(to),
                        validUntil: MoreThanOrEqual(from),
                    },
                ],
            }),
            // Only what can overlap the window; "Free" events never block (docs/06).
            CalendarEvent.findBy({
                userId: In(userIds),
                transparent: false,
                startAt: LessThan(windowEnd),
                endAt: MoreThan(windowStart),
            }),
            CalendarIgnoreRule.findBy({ userId: In(userIds) }),
        ]);
        const days = eachDay(from, to);
        // Days grouped by weekday once, so a rule visits its own 13-odd days, not all 93.
        const daysByWeekday = new Map<Weekday, IsoDateString[]>();
        for (const date of days) {
            const weekday = weekdayOf(date);
            daysByWeekday.set(weekday, [...(daysByWeekday.get(weekday) ?? []), date]);
        }

        const mark = (
            userId: string,
            date: IsoDateString,
            daypart: Daypart,
            reason: AvailabilityReason,
        ) => {
            const byDate = matrix.get(userId);
            if (byDate === undefined) return;
            const byDaypart = byDate.get(date) ?? new Map<Daypart, AvailabilityReason>();
            if (!byDaypart.has(daypart)) byDaypart.set(daypart, reason);
            byDate.set(date, byDaypart);
        };

        for (const block of blocks) {
            mark(block.userId, block.date, block.daypart, 'manual');
        }
        for (const rule of rules) {
            for (const date of daysByWeekday.get(rule.weekday) ?? []) {
                if (rule.appliesOn(date, rule.weekday)) {
                    mark(rule.userId, date, rule.daypart, 'rule');
                }
            }
        }
        const inWindow = new Set(days);
        for (const event of AvailabilityService.counted(events, ignores)) {
            for (const [date, daypart] of eventCells(
                event.startAt,
                event.endAt,
                event.allDay,
                event.startDate,
                event.endDate,
            )) {
                if (inWindow.has(date)) mark(event.userId, date, daypart, 'calendar');
            }
        }
        return matrix;
    }

    /** The events that block, minus the ones their owner told the app to ignore. */
    private static counted(
        events: CalendarEvent[],
        ignores: CalendarIgnoreRule[],
    ): CalendarEvent[] {
        const ignoredTitles = new Set(
            ignores
                .filter((rule) => rule.kind === CalendarIgnoreRuleKind.TITLE)
                .map((rule) => `${rule.userId}:${rule.value}`),
        );
        const ignoredSeries = new Set(
            ignores
                .filter((rule) => rule.kind === CalendarIgnoreRuleKind.SERIES)
                .map((rule) => `${rule.userId}:${rule.value}`),
        );
        return events.filter(
            (event) =>
                !ignoredTitles.has(`${event.userId}:${event.title.trim().toLowerCase()}`) &&
                (event.recurringEventId === null ||
                    !ignoredSeries.has(`${event.userId}:${event.recurringEventId}`)),
        );
    }

    /**
     * What is behind the owner's calendar cells: the titles of the counted
     * events per day and daypart. Only ever for the person themselves.
     */
    static async calendarTitles(
        userId: string,
        from: IsoDateString,
        to: IsoDateString,
    ): Promise<Map<IsoDateString, Map<Daypart, string[]>>> {
        const windowStart = DateTime.fromISO(from, { zone: TIME_ZONE })
            .startOf('day')
            .toUTC()
            .toJSDate();
        const windowEnd = DateTime.fromISO(to, { zone: TIME_ZONE }).endOf('day').toUTC().toJSDate();
        const [events, ignores] = await Promise.all([
            CalendarEvent.find({
                where: {
                    userId,
                    transparent: false,
                    startAt: LessThan(windowEnd),
                    endAt: MoreThan(windowStart),
                },
                order: { startAt: 'ASC' },
            }),
            CalendarIgnoreRule.findBy({ userId }),
        ]);
        const inWindow = new Set(eachDay(from, to));
        const titles = new Map<IsoDateString, Map<Daypart, string[]>>();
        for (const event of AvailabilityService.counted(events, ignores)) {
            for (const [date, daypart] of eventCells(
                event.startAt,
                event.endAt,
                event.allDay,
                event.startDate,
                event.endDate,
            )) {
                if (!inWindow.has(date)) continue;
                const byDaypart = titles.get(date) ?? new Map<Daypart, string[]>();
                byDaypart.set(daypart, [...(byDaypart.get(daypart) ?? []), event.title]);
                titles.set(date, byDaypart);
            }
        }
        return titles;
    }

    /** The caller's own days with reasons, for the editor. */
    static async forUser(
        user: User,
        from: IsoDateString,
        to: IsoDateString,
    ): Promise<MyAvailabilityResponse> {
        const [matrix, titles] = await Promise.all([
            AvailabilityService.matrix([user.id], from, to),
            AvailabilityService.calendarTitles(user.id, from, to),
        ]);
        return AvailabilityPresenter.mine(
            from,
            to,
            eachDay(from, to),
            matrix.get(user.id) ?? new Map<IsoDateString, Map<Daypart, AvailabilityReason>>(),
            titles,
        );
    }

    /**
     * The group's days, busy ids per daypart, for the overview. With an
     * activity, only the people who are in for it. `hasCalendar` is true for
     * somebody with an active, synced connection and at least one calendar on.
     */
    static async forGroup(
        group: Group,
        from: IsoDateString,
        to: IsoDateString,
        activityId: string | null,
    ): Promise<GroupAvailabilityResponse> {
        const members = await GroupMember.find({
            where: { groupId: group.id },
            relations: { user: true },
            order: { user: { displayName: 'ASC' } },
        });
        const inIds =
            activityId === null
                ? null
                : new Set((await ActivityInterest.findBy({ activityId })).map((row) => row.userId));
        const people = members
            .map((member) => member.user)
            .filter((user) => inIds === null || inIds.has(user.id));
        const matrix = await AvailabilityService.matrix(
            people.map((user) => user.id),
            from,
            to,
        );
        const withCalendar = new Set(
            (
                await CalendarConnection.find({
                    where: {
                        userId: In(people.map((user) => user.id)),
                        status: CalendarConnectionStatus.ACTIVE,
                        lastSyncedAt: Not(IsNull()),
                    },
                    relations: { sources: true },
                })
            )
                .filter((connection) => connection.sources.some((source) => source.enabled))
                .map((connection) => connection.userId),
        );
        return AvailabilityPresenter.group(
            from,
            to,
            eachDay(from, to),
            people,
            matrix,
            withCalendar,
        );
    }
}
