import type { Metadata } from 'next';

import { GroupAvailabilityView } from '@/components/availability/group-availability-view';

export const metadata: Metadata = { title: 'Availability' };

export default async function GroupAvailabilityPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    return <GroupAvailabilityView groupId={groupId} />;
}
