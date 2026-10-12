import type { Metadata } from 'next';

import { LeaderboardFormView } from '@/components/leaderboards/leaderboard-form-view';
import { safeReturnTo } from '@/lib/return-to';

export const metadata: Metadata = { title: 'New leaderboard' };

/**
 * `?player=` once per player when it is made for a game from the tools,
 * which makes it a private board for them, and `?returnTo=` for the way
 * back to that game once it is saved.
 */
export default async function NewLeaderboardPage({
    params,
    searchParams,
}: {
    params: Promise<{ groupId: string }>;
    searchParams: Promise<{ player?: string | string[]; returnTo?: string | string[] }>;
}) {
    const { groupId } = await params;
    const { player, returnTo } = await searchParams;
    return (
        <LeaderboardFormView
            groupId={groupId}
            players={player === undefined ? undefined : [player].flat()}
            returnTo={typeof returnTo === 'string' ? safeReturnTo(returnTo) : undefined}
        />
    );
}
