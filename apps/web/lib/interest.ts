import type { ActivityDetailDto, UserSummary } from '@bzim/types';

/**
 * The activity as it will read once the server agrees: the person in or
 * out of the "in" list, the count with them, and `iAmIn` when the person
 * is the viewer. Without a summary (an admin marking somebody whose
 * profile is not in any cache) the count moves and the list waits for the
 * refetch.
 */
export function applyInterest(
    activity: ActivityDetailDto,
    target: { userId: string; isMe: boolean; summary: UserSummary | null },
    inFor: boolean,
): ActivityDetailDto {
    const already = activity.interests.some((user) => user.id === target.userId);
    if (inFor === already) return activity;
    const interests = inFor
        ? target.summary === null
            ? activity.interests
            : [...activity.interests, target.summary]
        : activity.interests.filter((user) => user.id !== target.userId);
    return {
        ...activity,
        interests,
        interestCount: activity.interestCount + (inFor ? 1 : -1),
        iAmIn: target.isMe ? inFor : activity.iAmIn,
    };
}
