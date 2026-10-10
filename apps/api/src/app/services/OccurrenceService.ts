import { DateTime } from 'luxon';
import { Between } from 'typeorm';
import type { FindOptionsRelations } from 'typeorm';
import { API_ENDPOINTS, OccurrenceStatus, occurrenceWindow, windowsOverlap } from '@bzim/types';
import type { GroupOccurrenceDto, OccurrenceInput, OccurrenceUpdateInput } from '@bzim/types';

import { env } from '../../config/app';
import { AppDataSource } from '../../database/typeorm-db';
import type Activity from '../models/Activity.entity';
import ActivityInterest from '../models/ActivityInterest.entity';
import ActivityOccurrence from '../models/ActivityOccurrence.entity';
import type Group from '../models/Group.entity';
import OccurrenceParticipant from '../models/OccurrenceParticipant.entity';
import type User from '../models/User.entity';
import { calendarSpan } from '../utils/CalendarLinks';
import type { CalendarEvent } from '../utils/CalendarLinks';
import { signOccurrenceToken } from '../utils/SignedLink';
import { NotificationService } from './NotificationService';

export type OccurrenceProblem =
    /** A participant who never said "I'm in". */
    | 'PARTICIPANT_NOT_IN'
    /** A one-off activity already has a planned occurrence; re-date that one. */
    | 'ALREADY_OPEN';

export type OccurrenceResult =
    { ok: true; occurrence: ActivityOccurrence } | { ok: false; problem: OccurrenceProblem };

const RELATIONS: FindOptionsRelations<ActivityOccurrence> = {
    plannedBy: true,
    participants: { user: true },
};

/**
 * Planning: an activity on a date, with the people who count. Who gets
 * mailed about what is decided from `occurrence_participants.notified_*`:
 * never told → planned; told something else → rescheduled; cancelled → told
 * once more. The service stamps the rows after each send, so an edit that
 * changes nothing for somebody sends them nothing.
 */
export class OccurrenceService {
    static async plan(
        group: Group,
        activity: Activity,
        planner: User,
        input: OccurrenceInput,
    ): Promise<OccurrenceResult> {
        if (
            !activity.isRecurring &&
            (await ActivityOccurrence.existsBy({
                activityId: activity.id,
                status: OccurrenceStatus.PLANNED,
            }))
        ) {
            return { ok: false, problem: 'ALREADY_OPEN' };
        }
        if (!(await OccurrenceService.allIn(activity, input.participantIds))) {
            return { ok: false, problem: 'PARTICIPANT_NOT_IN' };
        }

        const created = await AppDataSource.transaction(async (manager) => {
            const occurrence = await manager.save(
                manager.create(ActivityOccurrence, {
                    activityId: activity.id,
                    date: input.date,
                    daypart: input.daypart ?? null,
                    startTime: input.startTime ?? null,
                    status: OccurrenceStatus.PLANNED,
                    plannedById: planner.id,
                    notes: input.notes ?? null,
                }),
            );
            await manager.save(
                input.participantIds.map((userId) =>
                    manager.create(OccurrenceParticipant, { occurrenceId: occurrence.id, userId }),
                ),
            );
            return occurrence;
        });

        const occurrence = await OccurrenceService.reload(created.id);
        await OccurrenceService.tellNewParticipants(group, activity, occurrence, planner);
        return { ok: true, occurrence: await OccurrenceService.reload(created.id) };
    }

    /**
     * Any combination of re-dating, changing who counts and moving the
     * status. Cancelling tells everyone who had been told; finishing tells
     * nobody; everything else is judged per participant.
     */
    static async update(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
        editor: User,
        patch: OccurrenceUpdateInput,
    ): Promise<OccurrenceResult> {
        if (
            patch.participantIds !== undefined &&
            !(await OccurrenceService.allIn(activity, patch.participantIds))
        ) {
            return { ok: false, problem: 'PARTICIPANT_NOT_IN' };
        }
        const wasPlanned = occurrence.status === OccurrenceStatus.PLANNED;

        if (patch.date !== undefined) occurrence.date = patch.date;
        if (patch.daypart !== undefined) occurrence.daypart = patch.daypart;
        if (patch.startTime !== undefined) occurrence.startTime = patch.startTime;
        if (patch.notes !== undefined) occurrence.notes = patch.notes;
        if (patch.status !== undefined) occurrence.status = patch.status;
        await occurrence.save();

        if (patch.participantIds !== undefined) {
            const wanted = new Set(patch.participantIds);
            const current = new Set(occurrence.participants.map((row) => row.userId));
            const gone = occurrence.participants.filter((row) => !wanted.has(row.userId));
            if (gone.length > 0) {
                await OccurrenceParticipant.remove(gone);
            }
            const added = [...wanted]
                .filter((userId) => !current.has(userId))
                .map((userId) =>
                    OccurrenceParticipant.create({ occurrenceId: occurrence.id, userId }),
                );
            if (added.length > 0) {
                await OccurrenceParticipant.save(added);
            }
        }

        const fresh = await OccurrenceService.reload(occurrence.id);
        if (fresh.status === OccurrenceStatus.CANCELLED) {
            if (wasPlanned) {
                await OccurrenceService.tellCancelled(group, activity, fresh);
            }
        } else if (fresh.status === OccurrenceStatus.PLANNED) {
            await OccurrenceService.tellNewParticipants(group, activity, fresh, editor);
            await OccurrenceService.tellRescheduled(group, activity, fresh, editor);
        }
        return { ok: true, occurrence: await OccurrenceService.reload(occurrence.id) };
    }

    /** Gone for good. People who had been told it was on are told it is off. */
    static async delete(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
    ): Promise<void> {
        if (occurrence.status === OccurrenceStatus.PLANNED) {
            await OccurrenceService.tellCancelled(group, activity, occurrence);
        }
        await occurrence.remove();
    }

    static findForActivity(
        activity: Activity,
        occurrenceId: string,
    ): Promise<ActivityOccurrence | null> {
        return ActivityOccurrence.findOne({
            where: { id: occurrenceId, activityId: activity.id },
            relations: RELATIONS,
        });
    }

    /** For the calendar file; the token is checked by the caller. Any status, so a cancelled one still resolves. */
    static findWithActivity(occurrenceId: string): Promise<ActivityOccurrence | null> {
        return ActivityOccurrence.findOne({
            where: { id: occurrenceId },
            relations: { ...RELATIONS, activity: { group: true } },
        });
    }

    /** The group's agenda: planned occurrences in a date range, each flagged with what it clashes with. */
    static async listForGroup(
        group: Group,
        from: string,
        to: string,
    ): Promise<GroupOccurrenceDto[]> {
        const rows = await ActivityOccurrence.find({
            where: {
                status: OccurrenceStatus.PLANNED,
                date: Between(from, to),
                activity: { groupId: group.id },
            },
            relations: { ...RELATIONS, activity: true },
            order: { date: 'ASC', startTime: 'ASC' },
        });
        const windows = new Map(
            rows.map((row) => [
                row.id,
                occurrenceWindow(row.daypart, row.startTime, row.activity.durationMinutes),
            ]),
        );
        return rows.map((row) => ({
            ...row.toDto(),
            activity: {
                id: row.activity.id,
                title: row.activity.title,
                category: row.activity.category,
            },
            conflictsWith: rows
                .filter(
                    (other) =>
                        other.id !== row.id &&
                        other.date === row.date &&
                        windowsOverlap(windows.get(row.id) ?? null, windows.get(other.id) ?? null),
                )
                .map((other) => other.id),
        }));
    }

    /** The occurrence as a calendar app sees it; the email links and the ICS file are built from this. */
    static calendarEvent(activity: Activity, occurrence: ActivityOccurrence): CalendarEvent {
        return {
            uid: `${occurrence.id}@bijzijn`,
            title: activity.title,
            description:
                [activity.description, occurrence.notes]
                    .filter((part): part is string => part !== null && part !== '')
                    .join('\n\n') || null,
            location: activity.locationText,
            url: OccurrenceService.activityLink(activity),
            span: calendarSpan(
                occurrence.date,
                occurrence.daypart,
                occurrence.startTime,
                activity.durationMinutes,
            ),
        };
    }

    static icsLink(occurrence: ActivityOccurrence): string {
        return `${env.apiUrl}${API_ENDPOINTS.OCCURRENCES.ICS(occurrence.id)}?token=${signOccurrenceToken(occurrence.id)}`;
    }

    static activityLink(activity: Activity): string {
        return `${env.appUrl}/groups/${activity.groupId}/activities/${activity.id}`;
    }

    /** Every participant must have said "I'm in"; the planner picks from that list. */
    private static async allIn(activity: Activity, userIds: string[]): Promise<boolean> {
        if (userIds.length === 0) return true;
        const interests = await ActivityInterest.findBy({ activityId: activity.id });
        const inIds = new Set(interests.map((row) => row.userId));
        return userIds.every((userId) => inIds.has(userId));
    }

    private static async tellNewParticipants(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
        planner: User,
    ): Promise<void> {
        const rows = occurrence.participants.filter((row) => row.notifiedAt === null);
        if (rows.length === 0) return;
        // The stamp does not wait for the mail: delivery failures are logged and
        // swallowed, so the outcome is the same either way and the two can overlap.
        await Promise.all([
            NotificationService.occurrencePlanned(group, activity, occurrence, planner, rows),
            OccurrenceService.stamp(rows, occurrence),
        ]);
    }

    private static async tellRescheduled(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
        editor: User,
    ): Promise<void> {
        const rows = occurrence.participants.filter(
            (row) =>
                row.notifiedAt !== null &&
                (row.notifiedForDate !== occurrence.date ||
                    row.notifiedForDaypart !== occurrence.daypart ||
                    row.notifiedForStartTime !== occurrence.startTime),
        );
        if (rows.length === 0) return;
        await Promise.all([
            NotificationService.occurrenceRescheduled(group, activity, occurrence, editor, rows),
            OccurrenceService.stamp(rows, occurrence),
        ]);
    }

    private static async tellCancelled(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
    ): Promise<void> {
        const rows = occurrence.participants.filter((row) => row.notifiedAt !== null);
        if (rows.length === 0) return;
        await NotificationService.occurrenceCancelled(group, activity, occurrence, rows);
    }

    /** Records what these people were just told, so the next edit can tell who needs to hear again. */
    private static async stamp(
        rows: OccurrenceParticipant[],
        occurrence: ActivityOccurrence,
    ): Promise<void> {
        const now = DateTime.utc().toJSDate();
        for (const row of rows) {
            row.notifiedAt = now;
            row.notifiedForDate = occurrence.date;
            row.notifiedForDaypart = occurrence.daypart;
            row.notifiedForStartTime = occurrence.startTime;
        }
        await OccurrenceParticipant.save(rows);
    }

    private static reload(occurrenceId: string): Promise<ActivityOccurrence> {
        return ActivityOccurrence.findOneOrFail({
            where: { id: occurrenceId },
            relations: RELATIONS,
        });
    }
}
