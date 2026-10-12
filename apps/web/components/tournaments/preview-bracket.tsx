'use client';

import type { TournamentPreviewMatchDto } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { knockoutRounds } from '@/lib/tournament-rounds';

/**
 * A knockout draft as the start will draw it: rounds as columns, the first
 * round's entries placed by seed and the byes already through to the second.
 * Only the first round's entries move (`chip` decides how they draw); what
 * comes after follows from them. On a phone the columns scroll sideways.
 */
export function PreviewBracket({
    preview,
    chip,
}: {
    preview: TournamentPreviewMatchDto[];
    /** An entry in a slot; `movable` is true in the first round only. */
    chip: (entryId: string, movable: boolean) => React.ReactNode;
}) {
    const { t } = useTranslation();
    const { rounds, thirdPlace } = knockoutRounds(preview);

    const card = (match: TournamentPreviewMatchDto) => {
        const slot = (entryId: string | null) =>
            entryId === null ? (
                <span className="block px-1.5 py-1 text-sm text-muted-foreground italic">
                    {match.isBye ? t('tournamentPlay.bye') : t('tournamentPlay.open')}
                </span>
            ) : (
                chip(entryId, match.round === 1)
            );
        return (
            <div
                key={`${String(match.round)}-${String(match.position)}`}
                className="space-y-0.5 rounded-xl border bg-card p-1"
            >
                {slot(match.homeEntryId)}
                {slot(match.awayEntryId)}
            </div>
        );
    };

    return (
        <div className="space-y-3">
            <div className="-mx-4 overflow-x-auto px-4 pb-2">
                <div className="flex min-w-max items-stretch gap-3">
                    {rounds.map((round) => (
                        <div key={round.round} className="flex w-52 shrink-0 flex-col">
                            <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                                {round.name === 'round'
                                    ? t('tournamentPlay.round', { number: round.round })
                                    : t(`tournamentPlay.rounds.${round.name}`)}
                            </h4>
                            <div className="flex flex-1 flex-col justify-around gap-3">
                                {round.matches.map(card)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {thirdPlace !== null && (
                <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-muted-foreground">
                        {t('tournamentPlay.rounds.third')}
                    </h4>
                    <div className="w-52">{card(thirdPlace)}</div>
                </div>
            )}
        </div>
    );
}
