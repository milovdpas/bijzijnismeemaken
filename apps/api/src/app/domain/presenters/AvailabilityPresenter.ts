import { DAYPART_ORDER } from '@bzim/types';
import type {
    AvailabilityReason,
    Daypart,
    GroupAvailabilityResponse,
    IsoDateString,
    MyAvailabilityResponse,
    UserSummary,
} from '@bzim/types';

import type User from '../models/User.entity';

type UserMatrix = Map<IsoDateString, Map<Daypart, AvailabilityReason>>;

/** Shapes the in-memory availability matrix into the two response forms. */
export default class AvailabilityPresenter {
    /** Every day in range, every daypart, the reason or null. */
    static mine(
        from: IsoDateString,
        to: IsoDateString,
        days: IsoDateString[],
        matrix: UserMatrix,
        titles: Map<IsoDateString, Map<Daypart, string[]>>,
    ): MyAvailabilityResponse {
        return {
            from,
            to,
            days: days.map((date) => ({
                date,
                dayparts: Object.fromEntries(
                    DAYPART_ORDER.map((daypart) => [
                        daypart,
                        matrix.get(date)?.get(daypart) ?? null,
                    ]),
                ) as Record<Daypart, AvailabilityReason | null>,
                calendarTitles: Object.fromEntries(
                    DAYPART_ORDER.map((daypart) => [daypart, titles.get(date)?.get(daypart) ?? []]),
                ) as Record<Daypart, string[]>,
            })),
        };
    }

    /** Reasons stripped: a group sees who is busy, never why. */
    static group(
        from: IsoDateString,
        to: IsoDateString,
        days: IsoDateString[],
        people: User[],
        matrix: Map<string, UserMatrix>,
        withCalendar: Set<string>,
    ): GroupAvailabilityResponse {
        const users = people.flatMap((user) => {
            const summary: UserSummary | null = user.toSummary();
            return summary === null
                ? []
                : [{ user: summary, hasCalendar: withCalendar.has(user.id) }];
        });
        return {
            from,
            to,
            users,
            days: days.map((date) => ({
                date,
                dayparts: Object.fromEntries(
                    DAYPART_ORDER.map((daypart) => [
                        daypart,
                        {
                            busy: users
                                .map(({ user }) => user.id)
                                .filter((id) => matrix.get(id)?.get(date)?.has(daypart) === true),
                        },
                    ]),
                ) as Record<Daypart, { busy: string[] }>,
            })),
        };
    }
}
