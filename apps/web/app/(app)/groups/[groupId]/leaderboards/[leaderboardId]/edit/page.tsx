import type { Metadata } from 'next';

import { LeaderboardFormView } from '@/components/leaderboards/leaderboard-form-view';

export const metadata: Metadata = { title: 'Edit leaderboard' };

export default async function EditLeaderboardPage({
    params,
}: {
    params: Promise<{ groupId: string; leaderboardId: string }>;
}) {
    const { groupId, leaderboardId } = await params;
    return <LeaderboardFormView groupId={groupId} leaderboardId={leaderboardId} />;
}
