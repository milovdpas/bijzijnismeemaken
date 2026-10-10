'use client';

import { EmptyState } from '@/components/common/empty-state';
import { GROUP_TABS } from '@/lib/group-navigation';
import type { GroupTab } from '@/lib/group-navigation';

/**
 * Stands in for a group tab until its task lands (leaderboards 28).
 */
export function GroupPlaceholder({ tab }: { tab: GroupTab }) {
    const item = GROUP_TABS.find((candidate) => candidate.tab === tab);
    if (item === undefined) return null;

    return (
        <EmptyState icon={item.icon} titleKey={item.labelKey} descriptionKey="group.comingSoon" />
    );
}
