import type { Metadata } from 'next';

import { GroupPlaceholder } from '@/components/groups/group-placeholder';

export const metadata: Metadata = { title: 'Settings' };

export default function GroupSettingsPage() {
    return <GroupPlaceholder tab="settings" />;
}
