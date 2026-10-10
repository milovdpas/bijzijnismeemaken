import type { Metadata } from 'next';

import { GroupSettingsView } from '@/components/groups/group-settings-view';

export const metadata: Metadata = { title: 'Group settings' };

export default async function GroupSettingsPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId } = await params;
    return <GroupSettingsView groupId={groupId} />;
}
