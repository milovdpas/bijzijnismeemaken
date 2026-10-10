import { Between, In, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import type {
    AvailabilityReason,
    Daypart,
    GroupAvailabilityResponse,
    IsoDateString,
    MyAvailabilityResponse,
    Weekday,
} from '@bzim/types';

import ActivityInterest from '../models/ActivityInterest.entity';
import type Group from '../models/Group.entity';
import GroupMember from '../models/GroupMember.entity';
import ManualUnavailability from '../models/ManualUnavailability.entity';
import type User from '../models/User.entity';
import WeeklyUnavailabilityRule from '../models/WeeklyUnavailabilityRule.entity';
import AvailabilityPresenter from '../presenters/AvailabilityPresenter';
import { eachDay, weekdayOf } from '../utils/Dates';

/** user → date → daypart → why busy, or absent when free. */
export type AvailabilityMatrix = Map<string, Map<IsoDateString, Map<Daypart, AvailabilityReason>>>;

/**
 * Who is free when, from what people said about their own time. The
 * calendar path (docs/06 step 3) joins in M2 as a third source feeding the
 * same matrix; nothing that reads the matrix will have to change.
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
        const [blocks, rules] = await Promise.all([
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
        return matrix;
    }

    /** The caller's own days with reasons, for the editor. */
    static async forUser(
        user: User,
        from: IsoDateString,
        to: IsoDateString,
    ): Promise<MyAvailabilityResponse> {
        const matrix = await AvailabilityService.matrix([user.id], from, to);
        return AvailabilityPresenter.mine(
            from,
            to,
            eachDay(from, to),
            matrix.get(user.id) ?? new Map<IsoDateString, Map<Daypart, AvailabilityReason>>(),
        );
    }

    /**
     * The group's days, busy ids per daypart, for the overview. With an
     * activity, only the people who are in for it. Nobody has a calendar yet;
     * that flag turns true per person in M2.
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
        return AvailabilityPresenter.group(from, to, eachDay(from, to), people, matrix);
    }
}
