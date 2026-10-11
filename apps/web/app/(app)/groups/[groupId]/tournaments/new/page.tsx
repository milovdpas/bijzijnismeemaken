import type { Metadata } from 'next';

import { TournamentFormView } from '@/components/tournaments/tournament-form-view';

export const metadata: Metadata = { title: 'New tournament' };

export default async function NewTournamentPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    return <TournamentFormView groupId={groupId} />;
}
