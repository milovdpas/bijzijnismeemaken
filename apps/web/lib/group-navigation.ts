import { Gamepad2, LayoutGrid, Medal, Sparkles, Trophy } from 'lucide-react';
import { CalendarDaysIcon } from '@/components/icons/calendar-days-icon';
import { GearIcon } from '@/components/icons/gear-icon';
import { PeopleIcon } from '@/components/icons/people-icon';
import type { NavIcon } from '@/lib/navigation';
import { GroupRole } from '@bzim/types';

/**
 * The sections inside one group. Rendered by `GroupShell` as a tab row, so
 * the group pages never have to agree on their own order or icons.
 */
export type GroupTab =
    | 'dashboard'
    | 'activities'
    | 'availability'
    | 'leaderboards'
    | 'tournaments'
    | 'tools'
    | 'members'
    | 'settings';

export interface GroupTabItem {
    tab: GroupTab;
    labelKey: string;
    icon: NavIcon;
    /** Settings is for the people who can change them. */
    adminOnly: boolean;
}

export const GROUP_TABS: readonly GroupTabItem[] = [
    { tab: 'dashboard', labelKey: 'groupTabs.dashboard', icon: LayoutGrid, adminOnly: false },
    { tab: 'activities', labelKey: 'groupTabs.activities', icon: Sparkles, adminOnly: false },
    {
        tab: 'availability',
        labelKey: 'groupTabs.availability',
        icon: CalendarDaysIcon,
        adminOnly: false,
    },
    { tab: 'leaderboards', labelKey: 'groupTabs.leaderboards', icon: Trophy, adminOnly: false },
    { tab: 'tournaments', labelKey: 'groupTabs.tournaments', icon: Medal, adminOnly: false },
    { tab: 'tools', labelKey: 'groupTabs.tools', icon: Gamepad2, adminOnly: false },
    { tab: 'members', labelKey: 'groupTabs.members', icon: PeopleIcon, adminOnly: false },
    { tab: 'settings', labelKey: 'groupTabs.settings', icon: GearIcon, adminOnly: true },
];

/** The dashboard is the group's root; every other tab is a path under it. */
export function groupHref(groupId: string, tab: GroupTab = 'dashboard'): string {
    return tab === 'dashboard' ? `/groups/${groupId}` : `/groups/${groupId}/${tab}`;
}

/** Which tab owns the current path, including its sub-pages (an activity's detail is still "activities"). */
export function activeGroupTab(pathname: string, groupId: string): GroupTab | null {
    if (pathname === `/groups/${groupId}`) return 'dashboard';
    const rest = pathname.startsWith(`/groups/${groupId}/`)
        ? pathname.slice(`/groups/${groupId}/`.length)
        : '';
    const first = rest.split('/')[0];
    return GROUP_TABS.find((item) => item.tab === first)?.tab ?? null;
}

export function canSeeTab(item: GroupTabItem, role: GroupRole): boolean {
    return !item.adminOnly || role === GroupRole.OWNER || role === GroupRole.ADMIN;
}
