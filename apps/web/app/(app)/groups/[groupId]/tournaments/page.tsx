import type { Metadata } from 'next';

import { TournamentsView } from '@/components/tournaments/tournaments-view';

export const metadata: Metadata = { title: 'Tournaments' };

export default async function GroupTournamentsPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    return <TournamentsView groupId={groupId} />;
}
