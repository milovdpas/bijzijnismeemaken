'use client';

import { GroupAccess } from '@bzim/types';
import { Globe, Link2, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

/** One icon per access mode, shared by the badge and the picker so they never disagree. */
export const ACCESS_ICONS: Record<GroupAccess, LucideIcon> = {
    [GroupAccess.PUBLIC]: Globe,
    [GroupAccess.INVITE_LINK]: Link2,
    [GroupAccess.INVITE_ONLY]: Lock,
};

/** A small chip saying how people get into a group. */
export function AccessBadge({ access, className }: { access: GroupAccess; className?: string }) {
    const { t } = useTranslation();
    const Icon = ACCESS_ICONS[access];

    return (
        <Badge variant="outline" className={className}>
            <Icon data-icon="inline-start" />
            {t(`access.${access}`)}
        </Badge>
    );
}
