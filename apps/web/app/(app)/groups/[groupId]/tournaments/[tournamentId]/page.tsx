import type { Metadata } from 'next';

import { TournamentDetailView } from '@/components/tournaments/tournament-detail-view';

export const metadata: Metadata = { title: 'Tournament' };

export default async function TournamentPage({
    params,
}: {
    params: Promise<{ groupId: string; tournamentId: string }>;
}) {
    const { groupId, tournamentId } = await params;
    return <TournamentDetailView groupId={groupId} tournamentId={tournamentId} />;
}
