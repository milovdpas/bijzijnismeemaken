import type { Metadata } from 'next';

import { GroupPlaceholder } from '@/components/groups/group-placeholder';

export const metadata: Metadata = { title: 'Availability' };

export default function GroupAvailabilityPage() {
    return <GroupPlaceholder tab="availability" />;
}
