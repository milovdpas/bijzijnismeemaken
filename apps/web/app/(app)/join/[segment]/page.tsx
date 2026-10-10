import type { Metadata } from 'next';

import { JoinView } from '@/components/groups/join-view';

export const metadata: Metadata = { title: 'Invitation' };

/** `/join/<slug>-<token>`: the whole segment goes to the view, which knows where the token is. */
export default async function JoinPage({ params }: { params: Promise<{ segment: string }> }) {
    const { segment } = await params;
    return <JoinView segment={segment} />;
}
