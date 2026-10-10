import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, Daypart, GroupRole, Locale, OccurrenceStatus } from '@bzim/types';
import type { GroupOccurrenceDto, OccurrenceDto } from '@bzim/types';

import ActivityInterest from '../src/app/models/ActivityInterest.entity';
import ActivityOccurrence from '../src/app/models/ActivityOccurrence.entity';
import OccurrenceParticipant from '../src/app/models/OccurrenceParticipant.entity';
import { mailer } from '../src/app/modules/mail';
import type { MailMessage } from '../src/app/modules/mail';
import { signOccurrenceToken } from '../src/app/utils/SignedLink';
import { sessionFor } from './support/auth';
import { api, asUser, data, error } from './support/client';
import {
    seedActivity,
    seedGroup,
    seedInterest,
    seedMember,
    seedOccurrence,
    seedParticipant,
    seedUser,
} from './support/factories';

function outbox(): MailMessage[] {
    const sent: MailMessage[] = [];
    vi.spyOn(mailer, 'send').mockImplementation((message) => {
        sent.push(message);
        return Promise.resolve();
    });
    return sent;
}

async function setup() {
    const owner = await seedUser({ displayName: 'Milo' });
    const group = await seedGroup(owner, { name: 'Vrienden' });
    const anna = await seedUser({ displayName: 'Anna', locale: Locale.EN });
    await seedMember(group, anna);
    const bob = await seedUser({ displayName: 'Bob' });
    await seedMember(group, bob);
    const cas = await seedUser({ displayName: 'Cas' });
    await seedMember(group, cas, GroupRole.ADMIN);
    const activity = await seedActivity(group, anna, {
        title: 'Kaartavond',
        locationText: 'Bij Milo',
        durationMinutes: 180,
    });
    await seedInterest(activity, anna);
    await seedInterest(activity, bob);
    const asOwner = asUser((await sessionFor(owner)).accessToken);
    const asAnna = asUser((await sessionFor(anna)).accessToken);
    const asBob = asUser((await sessionFor(bob)).accessToken);
    const plan = API_ENDPOINTS.ACTIVITIES.OCCURRENCES(group.id, activity.id);
    const one = (id: string) => API_ENDPOINTS.ACTIVITIES.OCCURRENCE(group.id, activity.id, id);
    return { owner, group, anna, bob, cas, activity, asOwner, asAnna, asBob, plan, one };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('POST …/occurrences', () => {
    it('plans, emails the chosen participants with both calendar links, and stamps them', async () => {
        const sent = outbox();
        const { anna, bob, activity, asAnna, plan } = await setup();

        const response = await asAnna.post(plan, {
            date: '2026-11-06',
            startTime: '19:30',
            participantIds: [anna.id, bob.id],
        });

        expect(response.status).toBe(201);
        const occurrence = data<OccurrenceDto>(response);
        expect(occurrence.status).toBe(OccurrenceStatus.PLANNED);
        expect(occurrence.startTime).toBe('19:30');
        expect(occurrence.plannedBy?.id).toBe(anna.id);
        expect(occurrence.participants.map((p) => p.id).sort()).toEqual([anna.id, bob.id].sort());

        expect(sent.map((m) => m.to).sort()).toEqual([anna.email, bob.email].sort());
        const toAnna = sent.find((m) => m.to === anna.email);
        expect(toAnna?.subject).toBe('Kaartavond is on: Friday 6 November 19:30');
        expect(toAnna?.text).toContain('at Bij Milo');
        expect(toAnna?.text).toContain(
            `${API_ENDPOINTS.OCCURRENCES.ICS(occurrence.id)}?token=${signOccurrenceToken(occurrence.id)}`,
        );
        expect(toAnna?.text).toContain('calendar.google.com/calendar/render');
        expect(toAnna?.text).toContain('20261106T183000Z%2F20261106T213000Z');
        const toBob = sent.find((m) => m.to === bob.email);
        expect(toBob?.subject).toBe('Kaartavond gaat door: vrijdag 6 november 19:30');

        const rows = await OccurrenceParticipant.findBy({ occurrenceId: occurrence.id });
        expect(rows.every((row) => row.notifiedAt !== null)).toBe(true);
        expect(rows[0]?.notifiedForDate).toBe('2026-11-06');
        expect(rows[0]?.notifiedForStartTime).toBe('19:30');
        expect(activity.isRecurring).toBe(false);
    });

    it('refuses outsiders, a second open plan for a one-off, and non-managers; marks a picked member in', async () => {
        outbox();
        const { anna, cas, activity, asAnna, asBob, asOwner, plan } = await setup();
        const outsider = await seedUser();

        const notMember = await asAnna.post(plan, {
            date: '2026-11-06',
            participantIds: [outsider.id],
        });
        expect(notMember.status).toBe(422);
        expect(error(notMember).details).toEqual({ problem: 'PARTICIPANT_NOT_MEMBER' });

        // Cas never pressed "I'm in" but is in the group: allowed, and marked in by Anna.
        const withCas = await asAnna.post(plan, { date: '2026-11-06', participantIds: [cas.id] });
        expect(withCas.status).toBe(201);
        const mark = await ActivityInterest.findOneByOrFail({
            activityId: activity.id,
            userId: cas.id,
        });
        expect(mark.addedById).toBe(anna.id);
        await ActivityOccurrence.delete({ id: data<OccurrenceDto>(withCas).id });

        expect((await asBob.post(plan, { date: '2026-11-06', participantIds: [] })).status).toBe(
            403,
        );

        expect(
            (await asOwner.post(plan, { date: '2026-11-06', participantIds: [anna.id] })).status,
        ).toBe(201);
        const again = await asOwner.post(plan, { date: '2026-11-07', participantIds: [] });
        expect(again.status).toBe(409);
        expect(error(again).details).toEqual({ problem: 'ALREADY_OPEN' });
        expect(await ActivityOccurrence.count()).toBe(1);
    });
});

describe('PATCH …/occurrences/:id', () => {
    it('re-dates: told people get rescheduled, newcomers get planned, the unchanged get nothing', async () => {
        const sent = outbox();
        const { anna, bob, asAnna, plan, one } = await setup();
        const occurrence = data<OccurrenceDto>(
            await asAnna.post(plan, { date: '2026-11-06', participantIds: [anna.id] }),
        );
        sent.length = 0;

        const moved = await asAnna.patch(one(occurrence.id), {
            date: '2026-11-13',
            daypart: Daypart.EVENING,
            participantIds: [anna.id, bob.id],
        });
        expect(moved.status).toBe(200);
        expect(data<OccurrenceDto>(moved).date).toBe('2026-11-13');
        expect(sent).toHaveLength(2);
        expect(sent.find((m) => m.to === anna.email)?.subject).toBe(
            'Kaartavond moved to Friday 13 November (evening)',
        );
        expect(sent.find((m) => m.to === bob.email)?.subject).toContain('gaat door');

        sent.length = 0;
        const notes = await asAnna.patch(one(occurrence.id), { notes: 'Neem kaarten mee' });
        expect(notes.status).toBe(200);
        expect(sent).toHaveLength(0);

        const dropped = await asAnna.patch(one(occurrence.id), { participantIds: [anna.id] });
        expect(data<OccurrenceDto>(dropped).participants.map((p) => p.id)).toEqual([anna.id]);
        expect(await OccurrenceParticipant.countBy({ occurrenceId: occurrence.id })).toBe(1);
    });

    it('cancelling tells the people who were told; finishing tells nobody', async () => {
        const sent = outbox();
        const { anna, bob, asAnna, plan, one } = await setup();
        const occurrence = data<OccurrenceDto>(
            await asAnna.post(plan, { date: '2026-11-06', participantIds: [anna.id, bob.id] }),
        );
        sent.length = 0;

        const done = await asAnna.patch(one(occurrence.id), { status: OccurrenceStatus.DONE });
        expect(data<OccurrenceDto>(done).status).toBe(OccurrenceStatus.DONE);
        expect(sent).toHaveLength(0);

        const reopened = await asAnna.patch(one(occurrence.id), {
            status: OccurrenceStatus.PLANNED,
        });
        expect(reopened.status).toBe(200);
        expect(sent).toHaveLength(0);

        const cancelled = await asAnna.patch(one(occurrence.id), {
            status: OccurrenceStatus.CANCELLED,
        });
        expect(data<OccurrenceDto>(cancelled).status).toBe(OccurrenceStatus.CANCELLED);
        expect(sent.map((m) => m.to).sort()).toEqual([anna.email, bob.email].sort());
        expect(sent.find((m) => m.to === anna.email)?.subject).toBe(
            'Kaartavond on Friday 6 November is cancelled',
        );
    });
});

describe('DELETE …/occurrences/:id', () => {
    it('removes it and tells the people who had been told', async () => {
        const sent = outbox();
        const { anna, asAnna, asOwner, plan, one } = await setup();
        const occurrence = data<OccurrenceDto>(
            await asAnna.post(plan, { date: '2026-11-06', participantIds: [anna.id] }),
        );
        sent.length = 0;

        expect((await asOwner.delete(one(occurrence.id))).status).toBe(204);
        expect(sent.map((m) => m.to)).toEqual([anna.email]);
        expect(await ActivityOccurrence.count()).toBe(0);
        expect(await OccurrenceParticipant.count()).toBe(0);
        expect((await asOwner.delete(one(occurrence.id))).status).toBe(404);
    });
});

describe('GET /groups/:groupId/occurrences', () => {
    it('lists planned occurrences in range with conflicts, and bounds the range', async () => {
        outbox();
        const { group, owner, bob, anna, activity, asBob } = await setup();
        const other = await seedActivity(group, owner, { title: 'Bowlen' });
        const evening = await seedOccurrence(activity, owner, {
            date: '2026-11-06',
            daypart: Daypart.EVENING,
        });
        await seedParticipant(evening, anna);
        const clash = await seedOccurrence(other, owner, {
            date: '2026-11-06',
            startTime: '20:00',
        });
        await seedOccurrence(other, owner, { date: '2026-11-06', startTime: '09:00' });
        await seedOccurrence(other, owner, { date: '2026-12-24' });
        await seedOccurrence(other, owner, { date: '2026-11-08', status: OccurrenceStatus.DONE });

        const url = API_ENDPOINTS.GROUPS.OCCURRENCES(group.id);
        const rows = data<GroupOccurrenceDto[]>(
            await asBob.get(`${url}?from=2026-11-01&to=2026-11-30`),
        );
        expect(rows.map((row) => row.date)).toEqual(['2026-11-06', '2026-11-06', '2026-11-06']);
        const mine = rows.find((row) => row.id === evening.id);
        expect(mine?.activity.title).toBe('Kaartavond');
        expect(mine?.participants.map((p) => p.id)).toEqual([anna.id]);
        expect(mine?.conflictsWith).toEqual([clash.id]);
        expect(rows.find((row) => row.id === clash.id)?.conflictsWith).toEqual([evening.id]);
        expect(bob.id).not.toBe(owner.id);

        expect((await asBob.get(`${url}?from=2026-11-30&to=2026-11-01`)).status).toBe(422);
        expect((await asBob.get(`${url}?from=2026-01-01&to=2026-12-31`)).status).toBe(422);
    });
});

describe('GET /occurrences/:id/ics', () => {
    it('serves the calendar file to a signed link and nothing to a forged one', async () => {
        outbox();
        const { anna, asAnna, plan } = await setup();
        const occurrence = data<OccurrenceDto>(
            await asAnna.post(plan, {
                date: '2026-11-06',
                startTime: '19:30',
                participantIds: [anna.id],
            }),
        );
        const url = API_ENDPOINTS.OCCURRENCES.ICS(occurrence.id);

        const good = await api.get(`${url}?token=${signOccurrenceToken(occurrence.id)}`);
        expect(good.status).toBe(200);
        expect(good.headers['content-type']).toContain('text/calendar');
        expect(good.headers['content-disposition']).toContain('.ics');
        expect(good.text).toContain('SUMMARY:Kaartavond');
        expect(good.text).toContain('DTSTART:20261106T183000Z');
        expect(good.text).toContain('DTEND:20261106T213000Z');
        expect(good.text).toContain('LOCATION:Bij Milo');

        expect((await api.get(`${url}?token=${'0'.repeat(64)}`)).status).toBe(404);
        expect((await api.get(url)).status).toBe(422);
    });
});
