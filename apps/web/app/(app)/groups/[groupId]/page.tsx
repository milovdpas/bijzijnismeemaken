import type { Metadata } from 'next';

import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata: Metadata = { title: 'Dashboard' };

/** A group's root is its dashboard. */
export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    return <DashboardView groupId={groupId} />;
}
