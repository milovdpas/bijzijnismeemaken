import { DateTime } from 'luxon';
import { In, Not } from 'typeorm';
import { AVAILABILITY, CalendarConnectionStatus, TIME_ZONE } from '@bzim/types';

import { AppDataSource } from '../../database/typeorm-db';
import CalendarConnection from '../models/CalendarConnection.entity';
import CalendarEvent from '../models/CalendarEvent.entity';
import { ProviderError } from '../modules/calendar/CalendarProvider';
import { CalendarService } from './CalendarService';

export interface ConnectionSyncResult {
    ok: boolean;
    sources: number;
    events: number;
}

/**
 * Pulling events into `calendar_events` (docs/02 §2.7, docs/03). Per
 * connection, per enabled source: the provider lists every instance from
 * today for `CALENDAR_SYNC_DAYS`, and that window replaces what the source
 * held, in one transaction, so a reader never sees half a calendar. A
 * failure is written on the connection rather than thrown: a dead grant
 * as `reauth_required`, anything else as `error` to be retried tomorrow.
 */
export class CalendarSyncService {
    /** Today at midnight in the app's zone, and the end of the window, as instants. */
    static window(): { from: Date; to: Date } {
        const start = DateTime.now().setZone(TIME_ZONE).startOf('day');
        return {
            from: start.toUTC().toJSDate(),
            to: start.plus({ days: AVAILABILITY.CALENDAR_SYNC_DAYS }).toUTC().toJSDate(),
        };
    }

    static async syncConnection(connection: CalendarConnection): Promise<ConnectionSyncResult> {
        const { from, to } = CalendarSyncService.window();
        const sources = connection.sources.filter((source) => source.enabled);
        let events = 0;
        try {
            const provider = CalendarService.provider();
            const accessToken = await CalendarService.accessToken(connection);
            for (const source of sources) {
                const listed = await provider.listEvents(
                    accessToken,
                    source.providerCalendarId,
                    from,
                    to,
                );
                const syncedAt = DateTime.utc().toJSDate();
                await AppDataSource.transaction(async (manager) => {
                    await manager.delete(CalendarEvent, { sourceId: source.id });
                    await manager.save(
                        listed.map((event) =>
                            manager.create(CalendarEvent, {
                                userId: connection.userId,
                                sourceId: source.id,
                                providerEventId: event.id,
                                recurringEventId: event.recurringEventId,
                                title: event.title.slice(0, 255),
                                startAt: event.startAt,
                                endAt: event.endAt,
                                allDay: event.allDay,
                                startDate: event.startDate,
                                endDate: event.endDate,
                                transparent: event.transparent,
                                eventType: event.eventType,
                                syncedAt,
                            }),
                        ),
                    );
                });
                events += listed.length;
            }
            connection.status = CalendarConnectionStatus.ACTIVE;
            connection.lastSyncedAt = DateTime.utc().toJSDate();
            connection.lastError = null;
            await connection.save();
            return { ok: true, sources: sources.length, events };
        } catch (error) {
            const reauth = error instanceof ProviderError && error.reauthRequired;
            connection.status = reauth
                ? CalendarConnectionStatus.REAUTH_REQUIRED
                : CalendarConnectionStatus.ERROR;
            connection.lastError = (error instanceof Error ? error.message : String(error)).slice(
                0,
                500,
            );
            await connection.save();
            return { ok: false, sources: sources.length, events };
        }
    }

    /** The nightly run: every connection that is not waiting on its owner to reconnect. */
    static async syncAll(): Promise<Record<string, number>> {
        const connections = await CalendarConnection.find({
            where: { status: Not(In([CalendarConnectionStatus.REAUTH_REQUIRED])) },
            relations: { sources: true },
        });
        const stats = { connections: connections.length, synced: 0, failed: 0, events: 0 };
        for (const connection of connections) {
            const result = await CalendarSyncService.syncConnection(connection);
            stats.events += result.events;
            if (result.ok) stats.synced += 1;
            else stats.failed += 1;
        }
        return stats;
    }
}
