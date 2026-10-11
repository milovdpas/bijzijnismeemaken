import { DateTime } from 'luxon';
import { In, IsNull, MoreThanOrEqual, Not } from 'typeorm';
import { CalendarConnectionStatus, OccurrenceStatus, TIME_ZONE } from '@bzim/types';

import { env } from '../../../config/app';
import type Activity from '../models/Activity.entity';
import type ActivityOccurrence from '../models/ActivityOccurrence.entity';
import CalendarConnection from '../models/CalendarConnection.entity';
import type Group from '../models/Group.entity';
import type User from '../models/User.entity';
import OccurrenceParticipant from '../models/OccurrenceParticipant.entity';
import { ProviderError } from '../../infrastructure/modules/calendar/CalendarProvider';
import type { EventInput } from '../../infrastructure/modules/calendar/CalendarProvider';
import { calendarSpan } from '../utils/CalendarLinks';
import { today } from '../utils/Dates';
import { CalendarService } from './CalendarService';

/**
 * Auto-add (docs/01 §1.4): a planned activity lands in the calendar of each
 * participant who turned the setting on and granted the write scope. The
 * provider's event id and the connection it went through sit on the
 * participant row, so a re-date updates it and a cancellation, a removal
 * or a departure deletes it. Nothing here ever fails the request that
 * triggered it: a provider that refuses is logged, and a dead grant marks
 * the connection for reconnecting.
 */
export class CalendarWriteService {
    /**
     * Bring the participants' calendars in line with the occurrence: create
     * what is missing, update what moved, delete what no longer applies.
     * Needs `participants.user` loaded.
     */
    static async sync(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
    ): Promise<void> {
        if (occurrence.status !== OccurrenceStatus.PLANNED) {
            await CalendarWriteService.remove(occurrence.participants);
            return;
        }
        const input = CalendarWriteService.eventInput(group, activity, occurrence);
        for (const row of occurrence.participants) {
            await CalendarWriteService.writeRow(row, input);
        }
    }

    /**
     * The switch just went on: every planned occurrence from today on that
     * the person is part of gets its event now, not at the next edit.
     */
    static async backfill(user: User): Promise<void> {
        const rows = await OccurrenceParticipant.find({
            where: {
                userId: user.id,
                occurrence: { status: OccurrenceStatus.PLANNED, date: MoreThanOrEqual(today()) },
            },
            relations: { user: true, occurrence: { activity: { group: true } } },
        });
        for (const row of rows) {
            const { occurrence } = row;
            const input = CalendarWriteService.eventInput(
                occurrence.activity.group,
                occurrence.activity,
                occurrence,
            );
            await CalendarWriteService.writeRow(row, input);
        }
    }

    /** The switch went off: whatever was written for this person comes out of their calendar. */
    static async removeAllFor(user: User): Promise<void> {
        await CalendarWriteService.remove(
            await OccurrenceParticipant.findBy({ userId: user.id, calendarEventId: Not(IsNull()) }),
        );
    }

    /** One participant: create or update their event, or take it out when they opted out. Needs `row.user`. */
    private static async writeRow(row: OccurrenceParticipant, input: EventInput): Promise<void> {
        if (!row.user.autoAddToCalendar) {
            if (row.calendarEventId !== null) await CalendarWriteService.remove([row]);
            return;
        }
        const connection = await CalendarWriteService.writableConnection(row);
        if (connection === null) return;
        const calendarId = CalendarWriteService.targetCalendar(connection);
        if (calendarId === null) return;
        try {
            const provider = CalendarService.provider();
            const accessToken = await CalendarService.accessToken(connection);
            if (row.calendarEventId === null || row.calendarConnectionId !== connection.id) {
                row.calendarEventId = await provider.createEvent(accessToken, calendarId, input);
                row.calendarConnectionId = connection.id;
            } else {
                await provider.updateEvent(accessToken, calendarId, row.calendarEventId, input);
            }
            await OccurrenceParticipant.update(
                { id: row.id },
                {
                    calendarEventId: row.calendarEventId,
                    calendarConnectionId: row.calendarConnectionId,
                },
            );
        } catch (error) {
            await CalendarWriteService.failed(connection, error);
        }
    }

    /** Takes the events of these rows out of their calendars and forgets the ids. */
    static async remove(rows: OccurrenceParticipant[]): Promise<void> {
        const written = rows.filter(
            (row) => row.calendarEventId !== null && row.calendarConnectionId !== null,
        );
        if (written.length === 0) return;
        const connections = new Map(
            (
                await CalendarConnection.find({
                    where: { id: In(written.map((row) => row.calendarConnectionId ?? '')) },
                    relations: { sources: true },
                })
            ).map((connection) => [connection.id, connection]),
        );
        for (const row of written) {
            const connection = connections.get(row.calendarConnectionId ?? '');
            const calendarId =
                connection === undefined ? null : CalendarWriteService.targetCalendar(connection);
            if (connection !== undefined && calendarId !== null && row.calendarEventId !== null) {
                try {
                    const accessToken = await CalendarService.accessToken(connection);
                    await CalendarService.provider().deleteEvent(
                        accessToken,
                        calendarId,
                        row.calendarEventId,
                    );
                } catch (error) {
                    await CalendarWriteService.failed(connection, error);
                }
            }
            row.calendarEventId = null;
            row.calendarConnectionId = null;
        }
        // An update, not a save: rows a departure already deleted must not come back.
        await OccurrenceParticipant.update(
            { id: In(written.map((row) => row.id)) },
            { calendarEventId: null, calendarConnectionId: null },
        );
    }

    /** What goes into the calendar: the activity, where, the notes, and a way back to the app. */
    static eventInput(
        group: Group,
        activity: Activity,
        occurrence: ActivityOccurrence,
    ): EventInput {
        const span = calendarSpan(
            occurrence.date,
            occurrence.daypart,
            occurrence.startTime,
            activity.durationMinutes,
        );
        const description = [
            activity.description,
            occurrence.notes,
            activity.locationText === null ? null : `📍 ${activity.locationText}`,
            `${group.name} · ${activity.title}`,
            `${CalendarWriteService.appLink(activity)}`,
        ]
            .filter((part): part is string => part !== null && part !== '')
            .join('\n\n');
        if (span.start === null || span.end === null) {
            const next = DateTime.fromISO(span.date, { zone: TIME_ZONE }).plus({ days: 1 });
            return {
                title: activity.title,
                description,
                startAt: null,
                endAt: null,
                startDate: span.date,
                endDate: next.toISODate() ?? span.date,
            };
        }
        return {
            title: activity.title,
            description,
            startAt: span.start.toUTC().toJSDate(),
            endAt: span.end.toUTC().toJSDate(),
            startDate: null,
            endDate: null,
        };
    }

    private static appLink(activity: Activity): string {
        return `${env.appUrl}/groups/${activity.groupId}/activities/${activity.id}`;
    }

    /** The person's active connection with the write scope, or null when there is nothing to write to. */
    private static writableConnection(
        row: OccurrenceParticipant,
    ): Promise<CalendarConnection | null> {
        return CalendarConnection.findOne({
            where: {
                userId: row.userId,
                status: CalendarConnectionStatus.ACTIVE,
                hasWriteScope: true,
            },
            relations: { sources: true },
        });
    }

    /** Events go to the primary calendar, as docs/01 says. */
    private static targetCalendar(connection: CalendarConnection): string | null {
        const primary = connection.sources.find((source) => source.isPrimary);
        return primary?.providerCalendarId ?? connection.sources[0]?.providerCalendarId ?? null;
    }

    /** Logged, and written on the connection so the settings page can show it; a dead grant also flips the status. */
    private static async failed(connection: CalendarConnection, error: unknown): Promise<void> {
        console.warn(`Calendar write failed for connection ${connection.id}:`, error);
        if (error instanceof ProviderError && error.reauthRequired) {
            connection.status = CalendarConnectionStatus.REAUTH_REQUIRED;
        }
        connection.lastError =
            `write: ${error instanceof Error ? error.message : String(error)}`.slice(0, 500);
        await connection.save();
    }
}
