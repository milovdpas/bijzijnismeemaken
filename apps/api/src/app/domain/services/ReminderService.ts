import { DateTime } from 'luxon';
import { OccurrenceStatus, TIME_ZONE } from '@bzim/types';

import ActivityOccurrence from '../models/ActivityOccurrence.entity';
import Group from '../models/Group.entity';
import OccurrenceParticipant from '../models/OccurrenceParticipant.entity';
import { today } from '../utils/Dates';
import { NotificationService } from './NotificationService';

export interface ReminderStats extends Record<string, number> {
    /** Planned occurrences tomorrow that still had somebody to remind. */
    occurrences: number;
    /** People reminded. */
    reminded: number;
}

/**
 * The day-before reminder (docs/02 §2.7): every participant of every
 * occurrence planned for tomorrow, once. The worker runs it in the evening;
 * `remindedAt` keeps a second run the same evening from sending twice and
 * is cleared when the moment moves, so a rescheduled activity reminds again.
 */
export class ReminderService {
    static async run(): Promise<ReminderStats> {
        const tomorrow = DateTime.fromISO(today(), { zone: TIME_ZONE })
            .plus({ days: 1 })
            .toISODate();
        if (tomorrow === null) {
            throw new Error('The clock produced no date');
        }
        const occurrences = await ActivityOccurrence.find({
            where: { date: tomorrow, status: OccurrenceStatus.PLANNED },
            relations: { activity: true, participants: { user: true } },
        });
        const stats: ReminderStats = { occurrences: 0, reminded: 0 };
        for (const occurrence of occurrences) {
            const rows = occurrence.participants.filter((row) => row.remindedAt === null);
            if (rows.length === 0) continue;
            const group = await Group.findOneByOrFail({ id: occurrence.activity.groupId });
            await NotificationService.occurrenceReminder(
                group,
                occurrence.activity,
                occurrence,
                rows,
            );
            const now = DateTime.utc().toJSDate();
            for (const row of rows) {
                row.remindedAt = now;
            }
            await OccurrenceParticipant.save(rows);
            stats.occurrences += 1;
            stats.reminded += rows.length;
        }
        return stats;
    }
}
