import type { Metadata } from 'next';

import { LeaderboardsView } from '@/components/leaderboards/leaderboards-view';

export const metadata: Metadata = { title: 'Leaderboards' };

export default async function GroupLeaderboardsPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    return <LeaderboardsView groupId={groupId} />;
}
