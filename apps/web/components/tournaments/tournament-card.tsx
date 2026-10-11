'use client';

import type { TournamentListingDto } from '@bzim/types';
import { Medal, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { TournamentMeta } from '@/components/tournaments/tournament-meta';
import { TournamentStatusBadge } from '@/components/tournaments/tournament-status-badge';
import { formatDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';

/** One tournament in the list: its name and state, how it is played, and the winner once it is done. */
export function TournamentCard({
    tournament,
    href,
    className,
}: {
    tournament: TournamentListingDto;
    href: string;
    className?: string;
}) {
    const { t, i18n } = useTranslation();
    return (
        <Link
            href={href}
            className={cn(
                'flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-ink/40',
                className,
            )}
        >
            <span className="flex gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                    <Medal className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 truncate text-base font-bold">
                            {tournament.name}
                        </span>
                        <TournamentStatusBadge status={tournament.status} className="shrink-0" />
                    </span>
                    <TournamentMeta tournament={tournament} className="mt-0.5" />
                </span>
            </span>
            {tournament.winnerName !== null && (
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <Trophy className="size-4 text-ink" />
                    <span className="font-semibold">
                        {t('tournaments.winner', { name: tournament.winnerName })}
                    </span>
                    {tournament.finishedAt !== null && (
                        <span className="text-xs text-muted-foreground">
                            {formatDate(tournament.finishedAt, i18n.language)}
                        </span>
                    )}
                </span>
            )}
        </Link>
    );
}
