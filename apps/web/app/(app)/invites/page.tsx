import type { Metadata } from 'next';

import { MyInvitesView } from '@/components/invites/my-invites-view';

export const metadata: Metadata = { title: 'Invitations' };

export default function InvitesPage() {
    return <MyInvitesView />;
}
