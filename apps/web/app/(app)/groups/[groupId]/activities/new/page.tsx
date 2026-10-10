import type { Metadata } from 'next';

import { ActivityFormView } from '@/components/activities/activity-form-view';

export const metadata: Metadata = { title: 'New activity' };

export default async function NewActivityPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    return <ActivityFormView groupId={groupId} />;
}
