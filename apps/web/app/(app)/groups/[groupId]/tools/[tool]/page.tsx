import type { Metadata } from 'next';

import { ToolView } from '@/components/tools/tool-view';

export const metadata: Metadata = { title: 'Tools' };

export default async function GroupToolPage({
    params,
}: {
    params: Promise<{ groupId: string; tool: string }>;
}) {
    const { groupId, tool } = await params;
    return <ToolView groupId={groupId} toolKey={tool} />;
}
