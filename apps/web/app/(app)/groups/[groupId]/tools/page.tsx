import type { Metadata } from 'next';

import { ToolsView } from '@/components/tools/tools-view';

export const metadata: Metadata = { title: 'Tools' };

export default async function GroupToolsPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    return <ToolsView groupId={groupId} />;
}
