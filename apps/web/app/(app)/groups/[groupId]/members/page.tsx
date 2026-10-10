import type { Metadata } from 'next';

import { GroupPlaceholder } from '@/components/groups/group-placeholder';

export const metadata: Metadata = { title: 'Members' };

export default function GroupMembersPage() {
    return <GroupPlaceholder tab="members" />;
}
