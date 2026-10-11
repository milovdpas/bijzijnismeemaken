import type { Metadata } from 'next';

import { TournamentFormView } from '@/components/tournaments/tournament-form-view';

export const metadata: Metadata = { title: 'New tournament' };

/** `?activityId=` when it is made from a tournament activity, which it then links to. */
export default async function NewTournamentPage({
    params,
    searchParams,
}: {
    params: Promise<{ groupId: string }>;
    searchParams: Promise<{ activityId?: string | string[] }>;
}) {
    const { groupId } = await params;
    const { activityId } = await searchParams;
    return (
        <TournamentFormView
            groupId={groupId}
            activityId={typeof activityId === 'string' ? activityId : undefined}
        />
    );
}
