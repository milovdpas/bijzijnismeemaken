import { afterEach, describe, expect, it, vi } from 'vitest';
import { DateTime } from 'luxon';
import {
    API_ENDPOINTS,
    Daypart,
    Locale,
    NotificationType,
    OccurrenceStatus,
    TIME_ZONE,
} from '@bzim/types';
import type { WorkerJobResponse } from '@bzim/types';

import OccurrenceParticipant from '../src/app/models/OccurrenceParticipant.entity';
import { mailer } from '../src/app/modules/mail';
import type { MailMessage } from '../src/app/modules/mail';
import { pushSender } from '../src/app/modules/push';
import type { PushMessage } from '../src/app/modules/push';
import { NotificationSettingService } from '../src/app/services/NotificationSettingService';
import { OccurrenceService } from '../src/app/services/OccurrenceService';
import { PushService } from '../src/app/services/PushService';
import { env } from '../src/config/app';
import { asWorker, data } from './support/client';
import {
    seedActivity,
    seedGroup,
    seedMember,
    seedOccurrence,
    seedParticipant,
    seedUser,
} from './support/factories';

const tomorrow = DateTime.now().setZone(TIME_ZONE).plus({ days: 1 }).toISODate() ?? '';
const dayAfter = DateTime.now().setZone(TIME_ZONE).plus({ days: 2 }).toISODate() ?? '';

function outbox(): { mails: MailMessage[]; pushes: PushMessage[] } {
    const mails: MailMessage[] = [];
    const pushes: PushMessage[] = [];
    vi.spyOn(mailer, 'send').mockImplementation((message) => {
        mails.push(message);
        return Promise.resolve();
    });
    vi.spyOn(pushSender, 'send').mockImplementation((_target, message) => {
        pushes.push(message);
        return Promise.resolve();
    });
    return { mails, pushes };
}

function run() {
    return asWorker(env.workerToken).post(API_ENDPOINTS.WORKER.OCCURRENCE_REMINDERS);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('POST /worker/occurrence-reminders', () => {
    it('reminds every participant of tomorrow once, in their language and on their channels', async () => {
        const sent = outbox();
        const owner = await seedUser({ displayName: 'Milo' });
        const group = await seedGroup(owner, { name: 'Kaartavond' });
        const anna = await seedUser({ locale: Locale.EN });
        const bob = await seedUser();
        await seedMember(group, anna);
        await seedMember(group, bob);
        await NotificationSettingService.update(bob, NotificationType.ACTIVITY_REMINDER, {
            email: false,
            push: true,
        });
        const activity = await seedActivity(group, owner, {
            title: 'Klaverjassen',
            locationText: 'Bij Milo',
        });
        const occurrence = await seedOccurrence(activity, owner, {
            date: tomorrow,
            daypart: Daypart.EVENING,
        });
        await seedParticipant(occurrence, anna);
        await seedParticipant(occurrence, bob);
        // Not tomorrow, cancelled, or done: none of these remind.
        const later = await seedOccurrence(activity, owner, { date: dayAfter });
        await seedParticipant(later, anna);
        const cancelled = await seedOccurrence(activity, owner, {
            date: tomorrow,
            status: OccurrenceStatus.CANCELLED,
        });
        await seedParticipant(cancelled, anna);

        const first = await run();

        expect(first.status).toBe(200);
        expect(data<WorkerJobResponse>(first)).toMatchObject({
            job: 'occurrence-reminders',
            stats: { occurrences: 1, reminded: 2 },
        });
        expect(sent.mails.map((mail) => mail.to)).toEqual([anna.email]);
        expect(sent.mails[0]?.subject).toContain('Klaverjassen');
        expect(sent.mails[0]?.text).toContain('Bij Milo');
        expect(sent.mails[0]?.text).toContain('tomorrow');
        expect(sent.pushes).toEqual([]);

        // Bob wants push, but has no device yet; the reminder is still counted as sent.
        const rows = await OccurrenceParticipant.findBy({ occurrenceId: occurrence.id });
        expect(rows.every((row) => row.remindedAt !== null)).toBe(true);

        const second = await run();
        expect(data<WorkerJobResponse>(second).stats).toEqual({ occurrences: 0, reminded: 0 });
        expect(sent.mails).toHaveLength(1);
    });

    it('reminds again after the moment moved, and pushes to a device', async () => {
        const sent = outbox();
        const owner = await seedUser();
        const group = await seedGroup(owner);
        const anna = await seedUser();
        await seedMember(group, anna);
        await NotificationSettingService.update(anna, NotificationType.ACTIVITY_REMINDER, {
            email: true,
            push: true,
        });
        const activity = await seedActivity(group, owner, { title: 'Bowlen' });
        const occurrence = await seedOccurrence(activity, owner, { date: tomorrow });
        const row = await seedParticipant(occurrence, anna);
        row.remindedAt = DateTime.utc().minus({ days: 3 }).toJSDate();
        await row.save();
        await PushService.subscribe(
            anna,
            { endpoint: 'https://push.example.test/anna', keys: { p256dh: 'p', auth: 'a' } },
            null,
        );

        expect(data<WorkerJobResponse>(await run()).stats).toEqual({
            occurrences: 0,
            reminded: 0,
        });

        // A reschedule through the service clears the reminder, as an edit does.
        const loaded = await OccurrenceService.findForActivity(activity, occurrence.id);
        expect(loaded).not.toBeNull();
        const edited = await OccurrenceService.update(group, activity, loaded!, owner, {
            daypart: Daypart.MORNING,
        });
        expect(edited.ok).toBe(true);
        sent.mails.length = 0;
        sent.pushes.length = 0;

        expect(data<WorkerJobResponse>(await run()).stats).toEqual({
            occurrences: 1,
            reminded: 1,
        });
        expect(sent.mails).toHaveLength(1);
        expect(sent.pushes).toEqual([
            {
                title: 'Morgen: Bowlen',
                body: expect.stringContaining('ochtend') as string,
                url: expect.stringContaining('/activities/') as string,
                tag: `occurrence-${occurrence.id}`,
            },
        ]);
    });
});
