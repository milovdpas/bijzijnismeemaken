import type { Metadata } from 'next';

import { GroupPlaceholder } from '@/components/groups/group-placeholder';

export const metadata: Metadata = { title: 'Activities' };

export default function GroupActivitiesPage() {
    return <GroupPlaceholder tab="activities" />;
}
