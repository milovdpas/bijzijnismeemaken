import type { Metadata } from 'next';

import { HistoryView } from '@/components/leaderboards/history-view';

export const metadata: Metadata = { title: 'Score history' };

export default async function LeaderboardHistoryPage({
    params,
}: {
    params: Promise<{ groupId: string; leaderboardId: string }>;
}) {
    const { groupId, leaderboardId } = await params;
    return <HistoryView groupId={groupId} leaderboardId={leaderboardId} />;
}
