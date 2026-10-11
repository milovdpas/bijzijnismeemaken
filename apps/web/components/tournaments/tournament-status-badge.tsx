'use client';

import { TournamentStatus } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

const VARIANTS = {
    [TournamentStatus.DRAFT]: 'outline',
    [TournamentStatus.RUNNING]: 'default',
    [TournamentStatus.FINISHED]: 'secondary',
} as const;

/** Where a tournament stands: being set up, being played, or done. */
export function TournamentStatusBadge({
    status,
    className,
}: {
    status: TournamentStatus;
    className?: string;
}) {
    const { t } = useTranslation();
    return (
        <Badge variant={VARIANTS[status]} className={className}>
            {t(`tournamentStatus.${status}`)}
        </Badge>
    );
}
