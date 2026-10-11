'use client';

import type { TournamentEntryDto, TournamentMatchView } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { MatchCard } from '@/components/tournaments/match-card';
import type { KnockoutRound } from '@/lib/tournament-rounds';

/**
 * The knockout as columns, first round on the left and the final on the
 * right. The columns share one height and spread their matches evenly, so
 * every match sits between the two that feed it: a bracket without drawing
 * lines. On a phone the columns scroll sideways.
 */
export function BracketView({
    rounds,
    entries,
    myEntryIds,
    action,
}: {
    rounds: KnockoutRound[];
    entries: ReadonlyMap<string, TournamentEntryDto>;
    myEntryIds: ReadonlySet<string>;
    /** What goes under a match, such as the button to enter its result. */
    action: (match: TournamentMatchView) => React.ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="flex min-w-max items-stretch gap-3">
                {rounds.map((round) => (
                    <div key={round.round} className="flex w-56 shrink-0 flex-col">
                        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                            {round.name === 'round'
                                ? t('tournamentPlay.round', { number: round.round })
                                : t(`tournamentPlay.rounds.${round.name}`)}
                        </h4>
                        <div className="flex flex-1 flex-col justify-around gap-3">
                            {round.matches.map((match) => (
                                <MatchCard
                                    key={match.id}
                                    match={match}
                                    entries={entries}
                                    myEntryIds={myEntryIds}
                                    action={action(match)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
