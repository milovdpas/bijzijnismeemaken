import { CalendarDays, Sparkles, Trophy, Users } from 'lucide-react';
import { GearIcon } from '@/components/icons/gear-icon';
import type { NavIcon } from '@/lib/navigation';
import { GroupRole } from '@bzim/types';

/**
 * The sections inside one group. Rendered by `GroupShell` as a tab row, so
 * the five group pages never have to agree on their own order or icons.
 */
export type GroupTab = 'activities' | 'availability' | 'leaderboards' | 'members' | 'settings';

export interface GroupTabItem {
    tab: GroupTab;
    labelKey: string;
    icon: NavIcon;
    /** Settings is for the people who can change them. */
    adminOnly: boolean;
}

export const GROUP_TABS: readonly GroupTabItem[] = [
    { tab: 'activities', labelKey: 'groupTabs.activities', icon: Sparkles, adminOnly: false },
    {
        tab: 'availability',
        labelKey: 'groupTabs.availability',
        icon: CalendarDays,
        adminOnly: false,
    },
    { tab: 'leaderboards', labelKey: 'groupTabs.leaderboards', icon: Trophy, adminOnly: false },
    { tab: 'members', labelKey: 'groupTabs.members', icon: Users, adminOnly: false },
    { tab: 'settings', labelKey: 'groupTabs.settings', icon: GearIcon, adminOnly: true },
];

export function groupHref(groupId: string, tab: GroupTab = 'activities'): string {
    return `/groups/${groupId}/${tab}`;
}

/** Which tab owns the current path, including its sub-pages (an activity's detail is still "activities"). */
export function activeGroupTab(pathname: string, groupId: string): GroupTab | null {
    const rest = pathname.startsWith(`/groups/${groupId}/`)
        ? pathname.slice(`/groups/${groupId}/`.length)
        : '';
    const first = rest.split('/')[0];
    return GROUP_TABS.find((item) => item.tab === first)?.tab ?? null;
}

export function canSeeTab(item: GroupTabItem, role: GroupRole): boolean {
    return !item.adminOnly || role === GroupRole.OWNER || role === GroupRole.ADMIN;
}
