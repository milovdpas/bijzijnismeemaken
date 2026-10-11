'use client';

import type { TournamentDetailDto } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { MatchCard } from '@/components/tournaments/match-card';
import { entryIndex, groupRounds, knockoutRounds } from '@/lib/tournament-rounds';
import type { RoundName } from '@/lib/tournament-rounds';

/**
 * A tournament under way or done: the group stage per group and round,
 * then the knockout round by round.
 */
export function TournamentPlay({ tournament }: { tournament: TournamentDetailDto }) {
    const { t } = useTranslation();
    const entries = entryIndex(tournament.entries);
    const mine = new Set(tournament.myEntryIds);
    const { rounds, thirdPlace } = knockoutRounds(tournament.matches);
    const groups = Array.from({ length: tournament.groupCount ?? 0 }, (_, index) => index + 1);
    const roundTitle = (name: RoundName, round: number) =>
        name === 'round'
            ? t('tournamentPlay.round', { number: round })
            : t(`tournamentPlay.rounds.${name}`);

    return (
        <div className="space-y-4">
            {groups.map((groupNo) => (
                <section key={groupNo} className="space-y-3 rounded-2xl border bg-card p-4">
                    <h3 className="text-base">{t('tournamentPlay.group', { number: groupNo })}</h3>
                    {groupRounds(tournament.matches, groupNo).map((round) => (
                        <div key={round.round} className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-muted-foreground">
                                {t('tournamentPlay.round', { number: round.round })}
                            </h4>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {round.matches.map((match) => (
                                    <MatchCard
                                        key={match.id}
                                        match={match}
                                        entries={entries}
                                        myEntryIds={mine}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            ))}

            {rounds.length > 0 && (
                <section className="space-y-3 rounded-2xl border bg-card p-4">
                    <h3 className="text-base">{t('tournamentPlay.knockout')}</h3>
                    {rounds.map((round) => (
                        <div key={round.round} className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-muted-foreground">
                                {roundTitle(round.name, round.round)}
                            </h4>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {round.matches.map((match) => (
                                    <MatchCard
                                        key={match.id}
                                        match={match}
                                        entries={entries}
                                        myEntryIds={mine}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                    {thirdPlace !== null && (
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-muted-foreground">
                                {t('tournamentPlay.rounds.third')}
                            </h4>
                            <MatchCard match={thirdPlace} entries={entries} myEntryIds={mine} />
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
