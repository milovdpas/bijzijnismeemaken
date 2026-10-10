import { describe, expect, it } from 'vitest';
import { CalendarEventType, CalendarIgnoreRuleKind } from '@bzim/types';

import CalendarConnection from '../src/app/models/CalendarConnection.entity';
import CalendarEvent from '../src/app/models/CalendarEvent.entity';
import CalendarIgnoreRule from '../src/app/models/CalendarIgnoreRule.entity';
import CalendarSource from '../src/app/models/CalendarSource.entity';
import OccurrenceParticipant from '../src/app/models/OccurrenceParticipant.entity';
import { AppDataSource } from '../src/database/typeorm-db';
import {
    seedActivity,
    seedCalendarConnection,
    seedCalendarSource,
    seedGroup,
    seedMember,
    seedOccurrence,
    seedParticipant,
    seedUser,
} from './support/factories';

describe('calendar schema', () => {
    it('stores tokens and the account email encrypted, and reads them back plain', async () => {
        const user = await seedUser();
        const connection = await seedCalendarConnection(user, {
            accountEmail: 'Milo.Agenda@Example.com',
            refreshToken: '1//refresh',
            accessToken: 'ya29.access',
        });

        const raw = await AppDataSource.query<
            { account_email: string; refresh_token_enc: Buffer; access_token_enc: Buffer }[]
        >(
            'SELECT account_email, refresh_token_enc, access_token_enc FROM calendar_connections WHERE id = ?',
            [connection.id],
        );
        expect(raw[0]?.account_email).not.toContain('Agenda');
        expect(raw[0]?.refresh_token_enc.toString('latin1')).not.toContain('refresh');
        expect(raw[0]?.access_token_enc.toString('latin1')).not.toContain('access');

        const loaded = await CalendarConnection.findOneOrFail({
            where: { id: connection.id },
            relations: { sources: true },
        });
        expect(loaded.accountEmail).toBe('Milo.Agenda@Example.com');
        expect(loaded.refreshToken).toBe('1//refresh');
        expect(loaded.accessToken).toBe('ya29.access');
        expect(loaded.toDto()).toMatchObject({
            accountEmail: 'Milo.Agenda@Example.com',
            hasWriteScope: false,
            sources: [],
        });
    });

    it('keeps one row per calendar and takes everything with the user', async () => {
        const user = await seedUser();
        const connection = await seedCalendarConnection(user);
        const source = await seedCalendarSource(connection, { providerCalendarId: 'primary' });
        await expect(
            seedCalendarSource(connection, { providerCalendarId: 'primary' }),
        ).rejects.toThrow();
        await CalendarEvent.create({
            userId: user.id,
            sourceId: source.id,
            providerEventId: 'evt-1',
            recurringEventId: null,
            title: 'Tandarts',
            startAt: new Date('2026-11-03T08:00:00.000Z'),
            endAt: new Date('2026-11-03T09:00:00.000Z'),
            allDay: false,
            startDate: null,
            endDate: null,
            transparent: false,
            eventType: CalendarEventType.DEFAULT,
            syncedAt: new Date(),
        }).save();
        await CalendarIgnoreRule.create({
            userId: user.id,
            kind: CalendarIgnoreRuleKind.TITLE,
            value: 'tandarts',
            label: 'Tandarts',
        }).save();

        // Somebody else owns the group: an owner cannot be deleted, by design.
        const group = await seedGroup(await seedUser());
        await seedMember(group, user);
        const activity = await seedActivity(group, user);
        const occurrence = await seedOccurrence(activity, user);
        const participant = await seedParticipant(occurrence, user);
        participant.calendarConnectionId = connection.id;
        await participant.save();

        // TypeORM clears the id of a removed entity, so keep them for the checks.
        const connectionId = connection.id;
        const userId = user.id;
        await connection.remove();
        expect(await CalendarSource.countBy({ connectionId })).toBe(0);
        expect(await CalendarEvent.countBy({ userId })).toBe(0);
        const kept = await OccurrenceParticipant.findOneByOrFail({ id: participant.id });
        expect(kept.calendarConnectionId).toBeNull();

        await user.remove();
        expect(await CalendarIgnoreRule.countBy({ userId })).toBe(0);
    });
});
