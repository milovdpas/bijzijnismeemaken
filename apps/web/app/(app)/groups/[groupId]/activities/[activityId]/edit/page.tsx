import type { Metadata } from 'next';

import { ActivityFormView } from '@/components/activities/activity-form-view';

export const metadata: Metadata = { title: 'Edit activity' };

export default async function EditActivityPage({
    params,
}: {
    params: Promise<{ groupId: string; activityId: string }>;
}) {
    const { groupId, activityId } = await params;
    return <ActivityFormView groupId={groupId} activityId={activityId} />;
}
