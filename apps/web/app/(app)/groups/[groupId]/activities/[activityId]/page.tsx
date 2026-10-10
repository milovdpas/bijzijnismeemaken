import type { Metadata } from 'next';

import { ActivityPlaceholder } from '@/components/activities/activity-placeholder';

export const metadata: Metadata = { title: 'Activity' };

/** The detail screen is task 21; until then this links to the edit form. */
export default async function ActivityPage({
    params,
}: {
    params: Promise<{ groupId: string; activityId: string }>;
}) {
    const { groupId, activityId } = await params;
    return <ActivityPlaceholder groupId={groupId} activityId={activityId} />;
}
