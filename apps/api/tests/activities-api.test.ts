import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    API_ENDPOINTS,
    ActivityCategory,
    ActivityLabel,
    DateMode,
    ERROR_CODES,
    GroupRole,
    NotificationType,
    Weekday,
} from '@bzim/types';
import type { ActivityDetailDto, ActivityListingDto } from '@bzim/types';

import Activity from '../src/app/models/Activity.entity';
import ActivityInterest from '../src/app/models/ActivityInterest.entity';
import NotificationSetting from '../src/app/models/NotificationSetting.entity';
import { mailer } from '../src/app/modules/mail';
import type { MailMessage } from '../src/app/modules/mail';
import { sessionFor } from './support/auth';
import { asUser, data, error } from './support/client';
import { seedActivity, seedGroup, seedMember, seedOccurrence, seedUser } from './support/factories';

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
    const member = await seedUser({ displayName: 'Anna' });
    await seedMember(group, member);
    const admin = await seedUser();
    await seedMember(group, admin, GroupRole.ADMIN);
    const outsider = await seedUser();
    const asOwner = asUser((await sessionFor(owner)).accessToken);
    const asMember = asUser((await sessionFor(member)).accessToken);
    const asAdmin = asUser((await sessionFor(admin)).accessToken);
    const asOutsider = asUser((await sessionFor(outsider)).accessToken);
    return { owner, group, member, admin, outsider, asOwner, asMember, asAdmin, asOutsider };
}

const IDEA = {
    category: ActivityCategory.HOME,
    title: 'Kaartavond',
    isRecurring: true,
    dateMode: DateMode.WEEKDAY,
    weekday: Weekday.FRIDAY,
    startTime: '19:30',
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('POST /groups/:groupId/activities', () => {
    it('creates, answers with the detail and emails the other members', async () => {
        const sent = outbox();
        const { group, member, owner, admin, asMember } = await setup();
        await NotificationSetting.create({
            userId: admin.id,
            type: NotificationType.ACTIVITY_CREATED,
            email: false,
            push: false,
        }).save();

        const response = await asMember.post(API_ENDPOINTS.ACTIVITIES.CREATE(group.id), IDEA);

        expect(response.status).toBe(201);
        const activity = data<ActivityDetailDto>(response);
        expect(activity.title).toBe('Kaartavond');
        expect(activity.category).toBe(ActivityCategory.HOME);
        expect(activity.creator?.id).toBe(member.id);
        expect(activity.label).toBe(ActivityLabel.IDEA);
        expect(activity.startTime).toBe('19:30');
        expect(activity.interests).toEqual([]);

        expect(sent.map((m) => m.to)).toEqual([owner.email]);
        expect(sent[0]?.subject).toContain('Anna');
        expect(sent[0]?.subject).toContain('Kaartavond');
        expect(sent[0]?.text).toContain(`/groups/${group.id}/activities/${activity.id}`);
    });

    it('validates fields and the cross-field rules', async () => {
        outbox();
        const { group, asMember } = await setup();

        const badUrl = await asMember.post(API_ENDPOINTS.ACTIVITIES.CREATE(group.id), {
            ...IDEA,
            externalUrl: 'not a url',
        });
        expect(badUrl.status).toBe(422);

        const badTime = await asMember.post(API_ENDPOINTS.ACTIVITIES.CREATE(group.id), {
            ...IDEA,
            startTime: '7pm',
        });
        expect(badTime.status).toBe(422);

        const mismatch = await asMember.post(API_ENDPOINTS.ACTIVITIES.CREATE(group.id), {
            ...IDEA,
            dateMode: DateMode.SPECIFIC,
            weekday: null,
        });
        expect(mismatch.status).toBe(422);
        expect(error(mismatch).code).toBe(ERROR_CODES.VALIDATION_FAILED);
        expect(error(mismatch).details).toEqual({ problem: 'RECURRING_WITH_SPECIFIC_DATE' });
        expect(await Activity.count()).toBe(0);
    });

    it('is for members only', async () => {
        const { group, asOutsider } = await setup();
        expect(
            (await asOutsider.post(API_ENDPOINTS.ACTIVITIES.CREATE(group.id), IDEA)).status,
        ).toBe(404);
    });
});

describe('GET /groups/:groupId/activities', () => {
    it('lists with labels and filters, and hides inactive ones from members', async () => {
        const { group, owner, asMember, asAdmin } = await setup();
        const planned = await seedActivity(group, owner, { title: 'Planned' });
        await seedOccurrence(planned, owner);
        await seedActivity(group, owner, { title: 'Idea' });
        await seedActivity(group, owner, { title: 'Gone', isActive: false });

        const all = data<ActivityListingDto[]>(
            await asMember.get(`${API_ENDPOINTS.ACTIVITIES.LIST(group.id)}?sort=next`),
        );
        expect(all.map((a) => a.title)).toEqual(['Planned', 'Idea']);
        expect(all[0]?.nextOccurrence?.date).toBe('2026-11-01');

        const onlyPlanned = data<ActivityListingDto[]>(
            await asMember.get(`${API_ENDPOINTS.ACTIVITIES.LIST(group.id)}?label=planned`),
        );
        expect(onlyPlanned.map((a) => a.title)).toEqual(['Planned']);

        const memberAsking = data<ActivityListingDto[]>(
            await asMember.get(`${API_ENDPOINTS.ACTIVITIES.LIST(group.id)}?includeInactive=true`),
        );
        expect(memberAsking.map((a) => a.title)).not.toContain('Gone');

        const adminAsking = data<ActivityListingDto[]>(
            await asAdmin.get(`${API_ENDPOINTS.ACTIVITIES.LIST(group.id)}?includeInactive=true`),
        );
        expect(adminAsking.map((a) => a.title)).toContain('Gone');

        expect(
            (await asMember.get(`${API_ENDPOINTS.ACTIVITIES.LIST(group.id)}?weekday=9`)).status,
        ).toBe(422);
    });
});

describe('detail, update and delete', () => {
    it('lets the creator and admins edit, nobody else', async () => {
        const { group, member, asMember, asAdmin, asOwner } = await setup();
        const other = await seedUser();
        await seedMember(group, other);
        const asOther = asUser((await sessionFor(other)).accessToken);
        const activity = await seedActivity(group, member, { title: 'Mine' });
        const url = API_ENDPOINTS.ACTIVITIES.DETAIL(group.id, activity.id);

        expect(data<ActivityDetailDto>(await asOther.get(url)).title).toBe('Mine');

        expect((await asOther.patch(url, { title: 'Theirs' })).status).toBe(403);
        expect((await asAdmin.patch(url, { title: 'Admin edit' })).status).toBe(200);
        const mine = await asMember.patch(url, { title: 'Still mine', costPerPerson: 5 });
        expect(mine.status).toBe(200);
        expect(data<ActivityDetailDto>(mine).title).toBe('Still mine');
        expect(data<ActivityDetailDto>(mine).costPerPerson).toBe(5);
        expect(data<ActivityDetailDto>(mine).category).toBe(ActivityCategory.OTHER);

        expect((await asMember.patch(url, {})).status).toBe(422);
        expect((await asMember.patch(url, { dateMode: DateMode.SPECIFIC })).status).toBe(422);

        expect((await asOther.delete(url)).status).toBe(403);
        expect((await asOwner.delete(url)).status).toBe(204);
        expect((await asMember.get(url)).status).toBe(404);
    });

    it('shows an inactive activity to admins only', async () => {
        const { group, owner, asMember, asAdmin } = await setup();
        const gone = await seedActivity(group, owner, { isActive: false });
        const url = API_ENDPOINTS.ACTIVITIES.DETAIL(group.id, gone.id);

        expect((await asMember.get(url)).status).toBe(404);
        expect((await asAdmin.get(url)).status).toBe(200);
    });
});

describe('interest', () => {
    it('lets a member mark themselves in and out', async () => {
        const { group, owner, member, asMember } = await setup();
        const activity = await seedActivity(group, owner);
        const url = API_ENDPOINTS.ACTIVITIES.INTEREST(group.id, activity.id);

        expect((await asMember.put(url)).status).toBe(204);
        expect((await asMember.put(url)).status).toBe(204);
        const detail = data<ActivityDetailDto>(
            await asMember.get(API_ENDPOINTS.ACTIVITIES.DETAIL(group.id, activity.id)),
        );
        expect(detail.iAmIn).toBe(true);
        expect(detail.interestCount).toBe(1);
        expect(detail.interests.map((u) => u.id)).toEqual([member.id]);

        expect((await asMember.delete(url)).status).toBe(204);
        expect(await ActivityInterest.count()).toBe(0);
    });

    it('lets admins mark other members, and only members', async () => {
        const { group, owner, member, outsider, admin, asMember, asAdmin } = await setup();
        const activity = await seedActivity(group, owner);

        expect(
            (
                await asMember.put(
                    API_ENDPOINTS.ACTIVITIES.INTEREST_OF(group.id, activity.id, owner.id),
                )
            ).status,
        ).toBe(403);
        expect(
            (
                await asAdmin.put(
                    API_ENDPOINTS.ACTIVITIES.INTEREST_OF(group.id, activity.id, outsider.id),
                )
            ).status,
        ).toBe(404);
        expect(
            (
                await asAdmin.put(
                    API_ENDPOINTS.ACTIVITIES.INTEREST_OF(group.id, activity.id, member.id),
                )
            ).status,
        ).toBe(204);
        const row = await ActivityInterest.findOneByOrFail({
            activityId: activity.id,
            userId: member.id,
        });
        expect(row.addedById).toBe(admin.id);

        expect(
            (
                await asAdmin.delete(
                    API_ENDPOINTS.ACTIVITIES.INTEREST_OF(group.id, activity.id, member.id),
                )
            ).status,
        ).toBe(204);
        expect(await ActivityInterest.count()).toBe(0);
    });
});
