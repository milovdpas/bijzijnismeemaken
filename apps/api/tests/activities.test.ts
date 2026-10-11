import { describe, expect, it } from 'vitest';
import {
    ActivityCategory,
    ActivityLabel,
    DateMode,
    Daypart,
    GroupRole,
    OccurrenceStatus,
    Weekday,
} from '@bzim/types';

import Activity from '../src/app/models/Activity.entity';
import ActivityInterest from '../src/app/models/ActivityInterest.entity';
import ActivityOccurrence from '../src/app/models/ActivityOccurrence.entity';
import OccurrenceParticipant from '../src/app/models/OccurrenceParticipant.entity';
import { ActivityService } from '../src/app/services/ActivityService';
import {
    seedActivity,
    seedGroup,
    seedInterest,
    seedMember,
    seedOccurrence,
    seedParticipant,
    seedUser,
} from './support/factories';

async function setup() {
    const owner = await seedUser();
    const group = await seedGroup(owner);
    const member = await seedUser();
    const membership = await seedMember(group, member);
    const admin = await seedUser();
    const adminMembership = await seedMember(group, admin, GroupRole.ADMIN);
    return { owner, group, member, membership, admin, adminMembership };
}

describe('ActivityService.create', () => {
    it('stores every field and answers with the creator and an idea label', async () => {
        const { group, member } = await setup();

        const result = await ActivityService.create(group, member, {
            category: ActivityCategory.HOME,
            title: 'Kaartavond',
            description: 'Klaverjassen',
            isRecurring: true,
            dateMode: DateMode.WEEKDAY,
            weekday: Weekday.FRIDAY,
            startTime: '19:30',
            locationText: 'Bij Milo',
            minPeople: 4,
            maxPeople: 8,
            costPerPerson: 2.5,
            durationMinutes: 180,
            preferredDayparts: [Daypart.EVENING],
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const dto = ActivityService.detail(result.activity, member);
        expect(dto.title).toBe('Kaartavond');
        expect(dto.category).toBe(ActivityCategory.HOME);
        expect(dto.weekday).toBe(Weekday.FRIDAY);
        expect(dto.startTime).toBe('19:30');
        expect(dto.costPerPerson).toBe(2.5);
        expect(dto.preferredDayparts).toEqual([Daypart.EVENING]);
        expect(dto.creator?.id).toBe(member.id);
        expect(dto.creatorName).toBe(member.displayName);
        expect(dto.label).toBe(ActivityLabel.IDEA);
        expect(dto.interestCount).toBe(0);
        expect(dto.iAmIn).toBe(false);
    });

    it('refuses an inconsistent date shape without writing anything', async () => {
        const { group, member } = await setup();

        const result = await ActivityService.create(group, member, {
            category: ActivityCategory.OTHER,
            title: 'Oops',
            isRecurring: true,
            dateMode: DateMode.SPECIFIC,
            specificDate: '2026-12-05',
        });

        expect(result).toEqual({ ok: false, problem: 'RECURRING_WITH_SPECIFIC_DATE' });
        expect(await Activity.count()).toBe(0);
    });
});

describe('ActivityService.update', () => {
    it('checks the merged result, so a patch cannot leave a half-valid row', async () => {
        const { group, member } = await setup();
        const activity = await seedActivity(group, member, {
            dateMode: DateMode.SPECIFIC,
            specificDate: '2026-12-05',
        });

        const bad = await ActivityService.update(activity, { dateMode: DateMode.NONE });
        expect(bad).toEqual({ ok: false, problem: 'SPECIFIC_DATE_MISMATCH' });

        const good = await ActivityService.update(activity, {
            dateMode: DateMode.NONE,
            specificDate: null,
            title: 'Renamed',
        });
        expect(good.ok).toBe(true);
        const fresh = await Activity.findOneByOrFail({ id: activity.id });
        expect(fresh.title).toBe('Renamed');
        expect(fresh.specificDate).toBeNull();
    });
});

describe('ActivityService.canManage', () => {
    it('is the creator or an admin', async () => {
        const { group, member, membership, adminMembership, owner } = await setup();
        const other = await seedUser();
        const otherMembership = await seedMember(group, other);
        const activity = await seedActivity(group, member);

        expect(ActivityService.canManage(activity, membership)).toBe(true);
        expect(ActivityService.canManage(activity, adminMembership)).toBe(true);
        expect(ActivityService.canManage(activity, otherMembership)).toBe(false);
        expect(owner.id).not.toBe(member.id);
    });
});

describe('ActivityService.listForGroup', () => {
    it('derives labels, picks the next planned occurrence and counts interest', async () => {
        const { group, owner, member } = await setup();
        const idea = await seedActivity(group, owner, { title: 'Idea' });
        const planned = await seedActivity(group, owner, { title: 'Planned' });
        await seedOccurrence(planned, owner, { date: '2026-12-20' });
        const soon = await seedOccurrence(planned, owner, { date: '2026-11-05' });
        await seedParticipant(soon, member);
        const done = await seedActivity(group, owner, { title: 'Done' });
        await seedOccurrence(done, owner, { date: '2026-09-01', status: OccurrenceStatus.DONE });
        await seedInterest(idea, member);
        await seedInterest(idea, owner);

        const rows = await ActivityService.listForGroup(group, member, { sort: 'next' });

        expect(rows.map((row) => row.title)).toEqual(['Planned', 'Done', 'Idea']);
        const [first, second, third] = rows;
        expect(first?.label).toBe(ActivityLabel.PLANNED);
        expect(first?.nextOccurrence?.date).toBe('2026-11-05');
        expect(first?.nextOccurrence?.participants.map((p) => p.id)).toEqual([member.id]);
        expect(second?.label).toBe(ActivityLabel.DONE);
        expect(third?.label).toBe(ActivityLabel.IDEA);
        expect(third?.interestCount).toBe(2);
        expect(third?.iAmIn).toBe(true);
        expect(first?.iAmIn).toBe(false);
    });

    it('filters by label, recurring, weekday and hides inactive unless asked', async () => {
        const { group, owner } = await setup();
        await seedActivity(group, owner, {
            title: 'Friday',
            isRecurring: true,
            dateMode: DateMode.WEEKDAY,
            weekday: Weekday.FRIDAY,
        });
        const sunday = await seedActivity(group, owner, {
            title: 'Sunday',
            dateMode: DateMode.WEEKDAY,
            weekday: Weekday.SUNDAY,
        });
        await seedOccurrence(sunday, owner);
        await seedActivity(group, owner, { title: 'Gone', isActive: false });

        const titles = async (filters: Parameters<typeof ActivityService.listForGroup>[2]) =>
            (await ActivityService.listForGroup(group, owner, filters)).map((row) => row.title);

        expect(await titles({})).toEqual(['Sunday', 'Friday']);
        expect(await titles({ label: ActivityLabel.PLANNED })).toEqual(['Sunday']);
        expect(await titles({ recurring: true })).toEqual(['Friday']);
        expect(await titles({ weekday: Weekday.SUNDAY })).toEqual(['Sunday']);
        expect(await titles({ includeInactive: true })).toEqual(['Gone', 'Sunday', 'Friday']);
    });
});

describe('interest', () => {
    it('adds once, records who marked whom, and removes', async () => {
        const { group, owner, member, admin } = await setup();
        const activity = await seedActivity(group, owner);

        await ActivityService.addInterest(activity, member.id, member);
        await ActivityService.addInterest(activity, member.id, member);
        await ActivityService.addInterest(activity, owner.id, admin);

        const rows = await ActivityInterest.findBy({ activityId: activity.id });
        expect(rows).toHaveLength(2);
        expect(rows.find((row) => row.userId === member.id)?.addedById).toBeNull();
        expect(rows.find((row) => row.userId === owner.id)?.addedById).toBe(admin.id);

        expect(await ActivityService.removeInterest(activity, member.id)).toBe(true);
        expect(await ActivityService.removeInterest(activity, member.id)).toBe(false);
        expect(await ActivityInterest.countBy({ activityId: activity.id })).toBe(1);
    });
});

describe('schema', () => {
    it('cascades interests, occurrences and participants with the activity, and keeps the activity when its creator goes', async () => {
        const { group, owner, member } = await setup();
        const activity = await seedActivity(group, member);
        await seedInterest(activity, owner);
        const occurrence = await seedOccurrence(activity, member);
        await seedParticipant(occurrence, owner);

        await member.remove();
        const orphan = await Activity.findOneOrFail({
            where: { id: activity.id },
            relations: { createdBy: true },
        });
        expect(orphan.createdById).toBeNull();
        expect(orphan.toDto().creator).toBeNull();
        expect(await ActivityOccurrence.countBy({ activityId: activity.id })).toBe(1);

        await ActivityService.delete(group, orphan);
        expect(await ActivityInterest.count()).toBe(0);
        expect(await ActivityOccurrence.count()).toBe(0);
        expect(await OccurrenceParticipant.count()).toBe(0);
    });

    it('allows one interest and one participation per person', async () => {
        const { group, owner, member } = await setup();
        const activity = await seedActivity(group, owner);
        await seedInterest(activity, member);
        await expect(seedInterest(activity, member)).rejects.toThrow(/Duplicate entry/);

        const occurrence = await seedOccurrence(activity, owner);
        await seedParticipant(occurrence, member);
        await expect(seedParticipant(occurrence, member)).rejects.toThrow(/Duplicate entry/);
    });

    it('reads dates and times back as the strings the API speaks', async () => {
        const { group, owner } = await setup();
        const activity = await seedActivity(group, owner, {
            dateMode: DateMode.SPECIFIC,
            specificDate: '2026-12-05',
            startTime: '19:30',
        });
        const fresh = await Activity.findOneByOrFail({ id: activity.id });
        expect(fresh.specificDate).toBe('2026-12-05');
        expect(fresh.startTime).toBe('19:30');
    });
});
