import { OccurrenceStatus } from '@bzim/types';
import type { ActivityDetailDto, ActivityListingDto, UserSummary } from '@bzim/types';

import type Activity from '../models/Activity.entity';
import { deriveActivityLabel } from '../utils/ActivityLabel';

/**
 * An activity plus what the caller needs around it: its derived label, the
 * next planned moment, how many are in and whether the caller is. Needs the
 * activity loaded with `createdBy`, `interests.user` and `occurrences`
 * (with `plannedBy` and `participants.user`).
 */
export default class ActivityPresenter {
    static listing(activity: Activity, viewerId: string): ActivityListingDto {
        const planned = activity.occurrences
            .filter((occurrence) => occurrence.status === OccurrenceStatus.PLANNED)
            .sort((a, b) => a.date.localeCompare(b.date));
        return {
            ...activity.toDto(),
            label: deriveActivityLabel(
                activity.isRecurring,
                activity.occurrences.map((occurrence) => occurrence.status),
            ),
            nextOccurrence: planned[0]?.toDto() ?? null,
            interestCount: activity.interests.length,
            iAmIn: activity.interests.some((interest) => interest.userId === viewerId),
        };
    }

    static detail(activity: Activity, viewerId: string): ActivityDetailDto {
        return {
            ...ActivityPresenter.listing(activity, viewerId),
            interests: activity.interests.flatMap((interest) => {
                const summary: UserSummary | null = interest.user.toSummary();
                return summary === null ? [] : [summary];
            }),
            occurrences: [...activity.occurrences]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((occurrence) => occurrence.toDto()),
        };
    }
}
