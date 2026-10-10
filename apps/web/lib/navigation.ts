import { SlidersHorizontal, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * The top-level sections, shared by the desktop top bar and the mobile bottom
 * nav so the two can never disagree. Group-level tabs (activities,
 * availability, leaderboards, members) live inside the group page, not here.
 */
export interface NavItem {
    href: string;
    labelKey: string;
    icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
    { href: '/groups', labelKey: 'nav.groups', icon: Users },
    { href: '/settings', labelKey: 'nav.settings', icon: SlidersHorizontal },
];

/** Whether a nav item owns the current path, including its sub-pages. */
export function isActiveNav(pathname: string, href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
}
