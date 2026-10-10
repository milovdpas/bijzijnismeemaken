import { Users } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

import { GearFillIcon } from '@/components/icons/gear-fill-icon';
import { GearIcon } from '@/components/icons/gear-icon';

/** What a nav icon must accept: Lucide icons and our own SVG components both do. */
export type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;

/**
 * The top-level sections, shared by the desktop top bar and the mobile bottom
 * nav so the two can never disagree. Group-level tabs (activities,
 * availability, leaderboards, members) live inside the group page, not here.
 */
export interface NavItem {
    href: string;
    labelKey: string;
    icon: NavIcon;
    /**
     * A separate drawing for the active state on the phone bar. Lucide icons
     * only need a fill; a gear drawn with strokes cannot be filled without
     * turning into a star, so it brings its own filled twin.
     */
    activeIcon?: NavIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
    { href: '/groups', labelKey: 'nav.groups', icon: Users },
    { href: '/settings', labelKey: 'nav.settings', icon: GearIcon, activeIcon: GearFillIcon },
];

/** Whether a nav item owns the current path, including its sub-pages. */
export function isActiveNav(pathname: string, href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
}
