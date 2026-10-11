'use client';

import { MatchStatus } from '@bzim/types';
import type { TournamentDetailDto, TournamentMatchView } from '@bzim/types';
import { Flag, GitMerge, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { BracketView } from '@/components/tournaments/bracket-view';
import { GroupTable } from '@/components/tournaments/group-table';
import { MatchCard } from '@/components/tournaments/match-card';
import { ResultDialog } from '@/components/tournaments/result-dialog';
import { Button } from '@/components/ui/button';
import { useAdvanceTournament, useFinishTournament } from '@/hooks/queries/use-tournaments';
import { launchConfetti } from '@/lib/confetti';
import { groupProgress } from '@/lib/tournament-result';
import {
    entryIndex,
    groupRounds,
    knockoutRounds,
    tournamentErrorKey,
} from '@/lib/tournament-rounds';

/**
 * A tournament under way or done. The winner on top once there is one, the
 * organiser's next step (draw the knockout, finish), the bracket, then each
 * group's table and matches. A match whose result the viewer may enter has
 * a button for it; a finished tournament is read-only.
 */
export function TournamentPlay({
    groupId,
    tournament,
}: {
    groupId: string;
    tournament: TournamentDetailDto;
}) {
    const { t } = useTranslation();
    const advance = useAdvanceTournament(groupId, tournament.id);
    const finish = useFinishTournament(groupId, tournament.id);
    const [reporting, setReporting] = useState<TournamentMatchView | null>(null);
    const [failure, setFailure] = useState<unknown>(null);

    const entries = entryIndex(tournament.entries);
    const mine = new Set(tournament.myEntryIds);
    const { rounds, thirdPlace } = knockoutRounds(tournament.matches);
    const winner =
        tournament.winnerEntryId === null ? undefined : entries.get(tournament.winnerEntryId);
    const progress = groupProgress(tournament.matches);

    const action = (match: TournamentMatchView) =>
        match.canReport ? (
            <Button
                size="xs"
                variant="outline"
                className="mt-1 w-full"
                onClick={() => setReporting(match)}
            >
                {match.status === MatchStatus.PLAYED
                    ? t('tournamentPlay.correctResult')
                    : t('tournamentPlay.enterResult')}
            </Button>
        ) : undefined;
    const matchGrid = (matches: TournamentMatchView[]) => (
        <div className="grid gap-2 sm:grid-cols-2">
            {matches.map((match) => (
                <MatchCard
                    key={match.id}
                    match={match}
                    entries={entries}
                    myEntryIds={mine}
                    action={action(match)}
                />
            ))}
        </div>
    );

    return (
        <div className="space-y-4">
            {winner !== undefined && (
                <section className="flex items-center gap-3 rounded-2xl border bg-brand/20 p-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                        <Trophy className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-lg font-bold">
                            {t('tournamentPlay.winner', { name: winner.name })}
                        </p>
                        {winner.members.length > 1 && (
                            <p className="truncate text-xs text-muted-foreground">
                                {winner.members.map((member) => member.displayName).join(', ')}
                            </p>
                        )}
                    </div>
                </section>
            )}

            {tournament.canManage && (tournament.canAdvance || tournament.canFinish) && (
                <section className="space-y-2 rounded-2xl border bg-card p-4">
                    {tournament.canAdvance && (
                        <>
                            <Button
                                disabled={advance.isPending}
                                onClick={() =>
                                    advance.mutate(undefined, {
                                        onSuccess: () => setFailure(null),
                                        onError: setFailure,
                                    })
                                }
                            >
                                <GitMerge />
                                {t('tournamentPlay.advance')}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                {t('tournamentPlay.advanceHelp')}
                            </p>
                        </>
                    )}
                    {tournament.canFinish && (
                        <>
                            <Button
                                disabled={finish.isPending}
                                onClick={() =>
                                    finish.mutate(undefined, {
                                        onSuccess: () => {
                                            setFailure(null);
                                            launchConfetti();
                                        },
                                        onError: setFailure,
                                    })
                                }
                            >
                                <Flag />
                                {t('tournamentPlay.finish')}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                {t('tournamentPlay.finishHelp')}
                            </p>
                        </>
                    )}
                </section>
            )}
            {failure !== null && (
                <FormMessage tone="error">{t(tournamentErrorKey(failure))}</FormMessage>
            )}

            {rounds.length > 0 && (
                <section className="space-y-3 rounded-2xl border bg-card p-4">
                    <h3 className="text-base">{t('tournamentPlay.knockout')}</h3>
                    <BracketView
                        rounds={rounds}
                        entries={entries}
                        myEntryIds={mine}
                        action={action}
                    />
                    {thirdPlace !== null && (
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-muted-foreground">
                                {t('tournamentPlay.rounds.third')}
                            </h4>
                            <MatchCard
                                match={thirdPlace}
                                entries={entries}
                                myEntryIds={mine}
                                action={action(thirdPlace)}
                                className="w-56"
                            />
                        </div>
                    )}
                </section>
            )}

            {tournament.groups.length > 0 && (
                <p className="text-xs text-muted-foreground tabular-nums">
                    {t('tournamentPlay.progress', progress)}
                </p>
            )}
            {tournament.groups.map((group) => (
                <section key={group.groupNo} className="space-y-3 rounded-2xl border bg-card p-4">
                    <h3 className="text-base">
                        {t('tournamentPlay.group', { number: group.groupNo })}
                    </h3>
                    <GroupTable group={group} entries={entries} myEntryIds={mine} />
                    {groupRounds(tournament.matches, group.groupNo).map((round) => (
                        <div key={round.round} className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-muted-foreground">
                                {t('tournamentPlay.round', { number: round.round })}
                            </h4>
                            {matchGrid(round.matches)}
                        </div>
                    ))}
                </section>
            ))}

            <ResultDialog
                key={reporting?.id ?? 'none'}
                groupId={groupId}
                tournament={tournament}
                match={reporting}
                onOpenChange={(open) => {
                    if (!open) setReporting(null);
                }}
            />
        </div>
    );
}
