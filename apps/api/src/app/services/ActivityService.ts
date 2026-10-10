import { ActivityLabel, GroupRole, Weekday, activityRuleProblem } from '@bzim/types';
import type {
    ActivityDetailDto,
    ActivityInput,
    ActivityListingDto,
    ActivityRuleProblem,
} from '@bzim/types';
import type { FindOptionsRelations } from 'typeorm';

import Activity from '../models/Activity.entity';
import ActivityInterest from '../models/ActivityInterest.entity';
import type Group from '../models/Group.entity';
import type GroupMember from '../models/GroupMember.entity';
import type User from '../models/User.entity';
import ActivityPresenter from '../presenters/ActivityPresenter';

export type ActivityResult =
    { ok: true; activity: Activity } | { ok: false; problem: ActivityRuleProblem };

export interface ActivityFilters {
    label?: ActivityLabel;
    recurring?: boolean;
    weekday?: Weekday;
    /** Admins only; the controller decides. Inactive = the creator left. */
    includeInactive?: boolean;
    /** `next`: soonest planned first, ideas after; `newest`: by creation. */
    sort?: 'next' | 'newest';
}

/** Everything the presenter reads, so a loaded activity is always presentable. */
const RELATIONS: FindOptionsRelations<Activity> = {
    createdBy: true,
    interests: { user: true },
    occurrences: { plannedBy: true, participants: { user: true } },
};

/** The field set `activityRuleProblem` judges, read off an activity or a patch over it. */
function ruleFields(activity: Activity) {
    return {
        isRecurring: activity.isRecurring,
        dateMode: activity.dateMode,
        specificDate: activity.specificDate,
        weekday: activity.weekday,
        minPeople: activity.minPeople,
        maxPeople: activity.maxPeople,
    };
}

/**
 * Activities and "I'm in" marks. Planning them onto dates is
 * `OccurrenceService` (task 19); this one never touches occurrences except
 * to read them for the label.
 */
export class ActivityService {
    /** Any member creates. The cross-field rules are checked here as well as in the validator. */
    static async create(
        group: Group,
        creator: User,
        input: ActivityInput,
    ): Promise<ActivityResult> {
        const activity = Activity.create({
            groupId: group.id,
            createdById: creator.id,
            creatorNameSnapshot: null,
            category: input.category,
            title: input.title,
            description: input.description ?? null,
            imageUrl: input.imageUrl ?? null,
            isRecurring: input.isRecurring,
            dateMode: input.dateMode,
            specificDate: input.specificDate ?? null,
            weekday: input.weekday ?? null,
            startTime: input.startTime ?? null,
            locationText: input.locationText ?? null,
            locationUrl: input.locationUrl ?? null,
            minPeople: input.minPeople ?? null,
            maxPeople: input.maxPeople ?? null,
            costPerPerson: input.costPerPerson ?? null,
            durationMinutes: input.durationMinutes ?? null,
            externalUrl: input.externalUrl ?? null,
            preferredDayparts: input.preferredDayparts ?? null,
            isActive: true,
        });
        const problem = activityRuleProblem(ruleFields(activity));
        if (problem !== null) {
            return { ok: false, problem };
        }
        await activity.save();
        return { ok: true, activity: await ActivityService.reload(activity.id) };
    }

    /** Creator or admin, decided by the caller. A patch is checked against the merged result. */
    static async update(
        activity: Activity,
        patch: Partial<ActivityInput>,
    ): Promise<ActivityResult> {
        // A PATCH body arrives with every absent field as undefined; those must not
        // overwrite what is there.
        Object.assign(
            activity,
            Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
        );
        const problem = activityRuleProblem(ruleFields(activity));
        if (problem !== null) {
            return { ok: false, problem };
        }
        await activity.save();
        return { ok: true, activity: await ActivityService.reload(activity.id) };
    }

    /** Interests and occurrences cascade in the database. */
    static async delete(activity: Activity): Promise<void> {
        await activity.remove();
    }

    /** Whether this member may edit, plan or delete the activity: its creator, or an admin. */
    static canManage(activity: Activity, membership: GroupMember): boolean {
        return activity.isCreatedBy(membership.userId) || membership.hasRole(GroupRole.ADMIN);
    }

    /** One activity of this group with everything loaded, or null. Inactive ones only when asked. */
    static findForGroup(
        group: Group,
        activityId: string,
        includeInactive: boolean,
    ): Promise<Activity | null> {
        return Activity.findOne({
            where: {
                id: activityId,
                groupId: group.id,
                ...(includeInactive ? {} : { isActive: true }),
            },
            relations: RELATIONS,
        });
    }

    /**
     * The group's list, response-ready. Label and weekday filters apply after
     * loading: the label is derived, and a group has tens of activities, not
     * thousands, so one query plus a filter beats a second query shape.
     */
    static async listForGroup(
        group: Group,
        viewer: User,
        filters: ActivityFilters = {},
    ): Promise<ActivityListingDto[]> {
        const activities = await Activity.find({
            where: {
                groupId: group.id,
                ...(filters.includeInactive ? {} : { isActive: true }),
                ...(filters.recurring === undefined ? {} : { isRecurring: filters.recurring }),
                ...(filters.weekday === undefined ? {} : { weekday: filters.weekday }),
            },
            relations: RELATIONS,
            order: { createdAt: 'DESC' },
        });
        const rows = activities
            .map((activity) => ActivityPresenter.listing(activity, viewer.id))
            .filter((row) => filters.label === undefined || row.label === filters.label);
        return filters.sort === 'next' ? rows.sort(byNextOccurrence) : rows;
    }

    static detail(activity: Activity, viewer: User): ActivityDetailDto {
        return ActivityPresenter.detail(activity, viewer.id);
    }

    /** "I'm in", for oneself or (by an admin) for somebody else. Already in is fine. */
    static async addInterest(activity: Activity, userId: string, addedBy: User): Promise<void> {
        if (await ActivityInterest.existsBy({ activityId: activity.id, userId })) {
            return;
        }
        await ActivityInterest.create({
            activityId: activity.id,
            userId,
            addedById: addedBy.id === userId ? null : addedBy.id,
        }).save();
    }

    /** Not in after all. True when there was a mark to remove. */
    static async removeInterest(activity: Activity, userId: string): Promise<boolean> {
        const result = await ActivityInterest.delete({ activityId: activity.id, userId });
        return (result.affected ?? 0) > 0;
    }

    /** Fresh from the database with every relation, after a write. */
    private static reload(activityId: string): Promise<Activity> {
        return Activity.findOneOrFail({ where: { id: activityId }, relations: RELATIONS });
    }
}

/** Planned activities by date, then everything without a date in creation order. */
function byNextOccurrence(a: ActivityListingDto, b: ActivityListingDto): number {
    if (a.nextOccurrence !== null && b.nextOccurrence !== null) {
        return a.nextOccurrence.date.localeCompare(b.nextOccurrence.date);
    }
    if (a.nextOccurrence !== null) return -1;
    if (b.nextOccurrence !== null) return 1;
    return 0;
}
