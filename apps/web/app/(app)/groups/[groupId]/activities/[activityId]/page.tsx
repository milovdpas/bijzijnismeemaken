import type { Metadata } from 'next';

import { ActivityDetailView } from '@/components/activities/activity-detail-view';

export const metadata: Metadata = { title: 'Activity' };

export default async function ActivityPage({
    params,
}: {
    params: Promise<{ groupId: string; activityId: string }>;
}) {
    const { groupId, activityId } = await params;
    return <ActivityDetailView groupId={groupId} activityId={activityId} />;
}
