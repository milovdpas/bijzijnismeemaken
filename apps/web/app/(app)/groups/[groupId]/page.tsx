import { redirect } from 'next/navigation';

import { groupHref } from '@/lib/group-navigation';

/** A group's root is its activities; there is nothing else to show on it. */
export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    redirect(groupHref(groupId));
}
