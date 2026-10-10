import type { Metadata } from 'next';

import { GroupPlaceholder } from '@/components/groups/group-placeholder';

export const metadata: Metadata = { title: 'Leaderboards' };

export default function GroupLeaderboardsPage() {
    return <GroupPlaceholder tab="leaderboards" />;
}
