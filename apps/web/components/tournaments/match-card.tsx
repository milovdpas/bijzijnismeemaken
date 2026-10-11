'use client';

import type { TournamentEntryDto, TournamentMatchView } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/**
 * One match: both sides with their scores, the winner in bold, the viewer's
 * own entry marked. A side still waiting for a winner from earlier reads as
 * open; a bye names the entry that goes through without playing.
 */
export function MatchCard({
    match,
    entries,
    myEntryIds,
    action,
    className,
}: {
    match: TournamentMatchView;
    entries: ReadonlyMap<string, TournamentEntryDto>;
    myEntryIds: ReadonlySet<string>;
    /** Below the sides, such as the button to enter the result. */
    action?: React.ReactNode;
    className?: string;
}) {
    const { t } = useTranslation();

    const side = (entryId: string | null, score: number | null) => {
        const entry = entryId === null ? undefined : entries.get(entryId);
        const won = entryId !== null && match.winnerEntryId === entryId && !match.isBye;
        const mine = entryId !== null && myEntryIds.has(entryId);
        return (
            <div className="flex items-center gap-2">
                <span
                    className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        mine ? 'bg-brand' : 'bg-transparent',
                    )}
                    aria-hidden
                />
                <span
                    className={cn(
                        'min-w-0 flex-1 truncate text-sm',
                        won && 'font-bold',
                        entry === undefined && 'text-muted-foreground italic',
                    )}
                >
                    {entry?.name ??
                        (match.isBye ? t('tournamentPlay.bye') : t('tournamentPlay.open'))}
                </span>
                {!match.isBye && (
                    <span
                        className={cn(
                            'w-8 shrink-0 text-right text-sm tabular-nums',
                            won ? 'font-bold' : 'text-muted-foreground',
                        )}
                    >
                        {score ?? ''}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className={cn('space-y-1 rounded-xl border bg-card px-3 py-2', className)}>
            {side(match.homeEntryId, match.homeScore)}
            {side(match.awayEntryId, match.awayScore)}
            {action}
        </div>
    );
}
