import type { Metadata } from 'next';

import { ActivitiesView } from '@/components/activities/activities-view';

export const metadata: Metadata = { title: 'Activities' };

export default async function GroupActivitiesPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    return <ActivitiesView groupId={groupId} />;
}
