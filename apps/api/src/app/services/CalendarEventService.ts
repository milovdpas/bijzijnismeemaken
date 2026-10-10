import { DateTime } from 'luxon';
import { LessThan, MoreThan } from 'typeorm';
import { TIME_ZONE } from '@bzim/types';
import type { IsoDateString } from '@bzim/types';

import CalendarEvent from '../models/CalendarEvent.entity';
import type User from '../models/User.entity';

/** A person's own synced events, titles included, for the ignore rules screen. */
export class CalendarEventService {
    static listOwn(user: User, from: IsoDateString, to: IsoDateString): Promise<CalendarEvent[]> {
        const start = DateTime.fromISO(from, { zone: TIME_ZONE }).startOf('day').toUTC().toJSDate();
        const end = DateTime.fromISO(to, { zone: TIME_ZONE }).endOf('day').toUTC().toJSDate();
        return CalendarEvent.find({
            where: { userId: user.id, startAt: LessThan(end), endAt: MoreThan(start) },
            order: { startAt: 'ASC' },
        });
    }
}
