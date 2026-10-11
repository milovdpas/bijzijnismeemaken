'use client';

import { ParticipantMode } from '@bzim/types';
import type { TournamentListingDto } from '@bzim/types';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/** The one-line summary under a tournament's name: how it is played, by whom, and how many. */
export function TournamentMeta({
    tournament,
    className,
}: {
    tournament: TournamentListingDto;
    className?: string;
}) {
    const { t } = useTranslation();
    return (
        <span
            className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground',
                className,
            )}
        >
            <span>{t(`tournamentFormats.${tournament.format}`)}</span>
            <span>
                {tournament.participantMode === ParticipantMode.TEAMS
                    ? t('tournaments.teamsOf', { count: tournament.teamSize ?? 0 })
                    : t('tournaments.players')}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
                <Users className="size-3.5" />
                {t('tournaments.entries', { count: tournament.entryCount })}
            </span>
        </span>
    );
}
