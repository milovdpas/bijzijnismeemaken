import type { Metadata } from 'next';

import { PageHeader } from '@/components/common/page-header';
import { ApiStatusCard } from '@/components/common/api-status-card';

export const metadata: Metadata = { title: 'Groups' };

/**
 * Placeholder until task 15 builds the groups list. It exists so the skeleton
 * has one real page that exercises the providers, i18n and the API client.
 */
export default function GroupsPage() {
    return (
        <>
            <PageHeader titleKey="groups.title" subtitleKey="groups.subtitle" />
            <ApiStatusCard />
        </>
    );
}
