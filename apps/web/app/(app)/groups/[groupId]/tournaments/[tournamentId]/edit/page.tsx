import type { Metadata } from 'next';

import { TournamentFormView } from '@/components/tournaments/tournament-form-view';

export const metadata: Metadata = { title: 'Edit tournament' };

export default async function EditTournamentPage({
    params,
}: {
    params: Promise<{ groupId: string; tournamentId: string }>;
}) {
    const { groupId, tournamentId } = await params;
    return <TournamentFormView groupId={groupId} tournamentId={tournamentId} />;
}
