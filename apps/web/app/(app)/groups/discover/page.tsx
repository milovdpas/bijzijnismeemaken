import type { Metadata } from 'next';

import { DiscoverView } from '@/components/groups/discover-view';

export const metadata: Metadata = { title: 'Public groups' };

export default function DiscoverPage() {
    return <DiscoverView />;
}
