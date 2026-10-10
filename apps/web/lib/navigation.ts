import type { ComponentType, SVGProps } from 'react';

import { CalendarDaysFillIcon } from '@/components/icons/calendar-days-fill-icon';
import { CalendarDaysIcon } from '@/components/icons/calendar-days-icon';
import { GearFillIcon } from '@/components/icons/gear-fill-icon';
import { GearIcon } from '@/components/icons/gear-icon';
import { PeopleFillIcon } from '@/components/icons/people-fill-icon';
import { PeopleIcon } from '@/components/icons/people-icon';

/** What a nav icon must accept: Lucide icons and our own SVG components both do. */
export type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;

/**
 * The top-level sections, shared by the desktop top bar and the mobile bottom
 * nav so the two can never disagree. Every section brings an outline and a
 * filled drawing: the phone bar marks the active one by swapping them.
 */
export interface NavItem {
    href: string;
    labelKey: string;
    icon: NavIcon;
    activeIcon: NavIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
    { href: '/groups', labelKey: 'nav.groups', icon: PeopleIcon, activeIcon: PeopleFillIcon },
    {
        href: '/availability',
        labelKey: 'nav.availability',
        icon: CalendarDaysIcon,
        activeIcon: CalendarDaysFillIcon,
    },
    { href: '/settings', labelKey: 'nav.settings', icon: GearIcon, activeIcon: GearFillIcon },
];

/** Whether a nav item owns the current path, including its sub-pages. */
export function isActiveNav(pathname: string, href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
}
