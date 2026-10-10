import type { Metadata } from 'next';

import { MembersView } from '@/components/groups/members-view';

export const metadata: Metadata = { title: 'Members' };

export default async function GroupMembersPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    return <MembersView groupId={groupId} />;
}
