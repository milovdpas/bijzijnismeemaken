import type { Metadata } from 'next';

import { LeaderboardDetailView } from '@/components/leaderboards/leaderboard-detail-view';

export const metadata: Metadata = { title: 'Leaderboard' };

export default async function LeaderboardPage({
    params,
}: {
    params: Promise<{ groupId: string; leaderboardId: string }>;
}) {
    const { groupId, leaderboardId } = await params;
    return <LeaderboardDetailView groupId={groupId} leaderboardId={leaderboardId} />;
}
