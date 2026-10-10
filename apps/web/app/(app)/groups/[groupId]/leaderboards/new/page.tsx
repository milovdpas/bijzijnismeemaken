import type { Metadata } from 'next';

import { LeaderboardFormView } from '@/components/leaderboards/leaderboard-form-view';

export const metadata: Metadata = { title: 'New leaderboard' };

export default async function NewLeaderboardPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    return <LeaderboardFormView groupId={groupId} />;
}
