import { DateTime } from 'luxon';
import { In } from 'typeorm';
import {
    AVAILABILITY,
    DAYPARTS,
    DAYPART_ORDER,
    DateMode,
    TIME_ZONE,
    occurrenceWindow,
    windowsOverlap,
} from '@bzim/types';
import type { Daypart, IsoDateString, SuggestionDto, SuggestionsResponse } from '@bzim/types';

import type Activity from '../models/Activity.entity';
import type Group from '../models/Group.entity';
import GroupMember from '../models/GroupMember.entity';
import { eachDay, weekdayOf } from '../utils/Dates';
import { AvailabilityService } from './AvailabilityService';
import { OccurrenceService } from './OccurrenceService';

/**
 * Which dates to propose for an activity, docs/06 "Date suggestions": every
 * candidate (date, daypart) the activity allows, scored by how many of the
 * chosen people are free, with a flag when the group already has something
 * planned then. The ranking is pure once the matrix and the agenda are in.
 */
export class SuggestionService {
    static async rank(
        group: Group,
        activity: Activity,
        requestedMemberIds: string[],
        requestedFrom: IsoDateString,
        weeks: number,
    ): Promise<SuggestionsResponse> {
        // A period that has not begun yet is looked at from its first day, or
        // its weeks would all fall outside the window.
        const start =
            activity.dateMode === DateMode.PERIOD &&
            activity.periodStart !== null &&
            activity.periodStart > requestedFrom
                ? activity.periodStart
                : requestedFrom;
        const to =
            DateTime.fromISO(start, { zone: TIME_ZONE })
                .plus({ days: weeks * 7 - 1 })
                .toISODate() ?? start;
        const from = start;
        // Only members: the matrix of an outsider is nobody's business, and the
        // planner cannot count somebody who is not in the group anyway.
        const memberIds =
            requestedMemberIds.length === 0
                ? []
                : (
                      await GroupMember.findBy({
                          groupId: group.id,
                          userId: In([...new Set(requestedMemberIds)]),
                      })
                  ).map((row) => row.userId);

        const [matrix, agenda] = await Promise.all([
            AvailabilityService.matrix(memberIds, from, to),
            OccurrenceService.listForGroup(group, from, to),
        ]);
        const others = agenda.filter((occurrence) => occurrence.activity.id !== activity.id);
        const dayparts = SuggestionService.candidateDayparts(activity);

        const candidates: SuggestionDto[] = [];
        for (const date of SuggestionService.candidateDates(activity, from, to)) {
            const sameDay = others.filter((occurrence) => occurrence.date === date);
            for (const daypart of dayparts) {
                const busyIds = memberIds.filter(
                    (id) => matrix.get(id)?.get(date)?.has(daypart) === true,
                );
                const busy = new Set(busyIds);
                const window = occurrenceWindow(daypart, null, null);
                candidates.push({
                    date,
                    daypart,
                    freeCount: memberIds.length - busyIds.length,
                    freeIds: memberIds.filter((id) => !busy.has(id)),
                    busyIds,
                    conflict: sameDay.some((occurrence) =>
                        windowsOverlap(
                            window,
                            occurrenceWindow(
                                occurrence.daypart,
                                occurrence.startTime,
                                occurrence.activity.durationMinutes,
                            ),
                        ),
                    ),
                });
            }
        }

        candidates.sort(
            (a, b) =>
                b.freeCount - a.freeCount ||
                a.date.localeCompare(b.date) ||
                DAYPART_ORDER.indexOf(a.daypart) - DAYPART_ORDER.indexOf(b.daypart),
        );
        return {
            items: candidates.slice(0, AVAILABILITY.SUGGESTION_LIMIT),
            total: candidates.length,
            memberIds,
            from,
            to,
        };
    }

    /**
     * A specific date is the only candidate; a weekday gives every matching
     * day; a period every day inside it; no preference gives them all.
     */
    private static candidateDates(
        activity: Activity,
        from: IsoDateString,
        to: IsoDateString,
    ): IsoDateString[] {
        if (activity.dateMode === DateMode.SPECIFIC) {
            const date = activity.specificDate;
            return date !== null && date >= from && date <= to ? [date] : [];
        }
        const days = eachDay(from, to);
        if (activity.dateMode === DateMode.WEEKDAY) {
            return days.filter((date) => weekdayOf(date) === activity.weekday);
        }
        if (activity.dateMode === DateMode.PERIOD) {
            const { periodStart, periodEnd } = activity;
            return periodStart === null || periodEnd === null
                ? []
                : days.filter((date) => date >= periodStart && date <= periodEnd);
        }
        return days;
    }

    /** Preferred dayparts win; else the daypart a start time falls in; else all three. */
    private static candidateDayparts(activity: Activity): readonly Daypart[] {
        if (activity.preferredDayparts !== null && activity.preferredDayparts.length > 0) {
            return DAYPART_ORDER.filter((daypart) => activity.preferredDayparts?.includes(daypart));
        }
        if (activity.startTime !== null) {
            const hour = Number(activity.startTime.slice(0, 2));
            const containing = DAYPART_ORDER.find(
                (daypart) =>
                    DAYPARTS[daypart].startHour <= hour && hour < DAYPARTS[daypart].endHour,
            );
            if (containing !== undefined) return [containing];
        }
        return DAYPART_ORDER;
    }
}
