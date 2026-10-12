'use client';

import { ParticipantMode } from '@bzim/types';
import type { TournamentDetailDto } from '@bzim/types';
import { Play, Shuffle, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormMessage } from '@/components/common/form-message';
import { AddEntryDialog } from '@/components/tournaments/add-entry-dialog';
import { DraftPreview } from '@/components/tournaments/draft-preview';
import { Button } from '@/components/ui/button';
import { useDrawTournament, useStartTournament } from '@/hooks/queries/use-tournaments';
import { canDealTeams, randomTeamCount } from '@/lib/tournament-draft';
import { tournamentErrorKey } from '@/lib/tournament-rounds';

/**
 * A tournament before it starts. The organiser and admins add entries,
 * shuffle the draw or deal random teams, put entries in order and in
 * groups, and start it; everybody else sees who is in while they wait.
 */
export function TournamentDraft({
    groupId,
    tournament,
}: {
    groupId: string;
    tournament: TournamentDetailDto;
}) {
    const { t } = useTranslation();
    const draw = useDrawTournament(groupId, tournament.id);
    const start = useStartTournament(groupId, tournament.id);
    const [adding, setAdding] = useState(false);
    const [dealing, setDealing] = useState(false);
    const [failure, setFailure] = useState<unknown>(null);
    const manage = tournament.canManage;
    const teams = tournament.participantMode === ParticipantMode.TEAMS;
    const people = tournament.entries.reduce((sum, entry) => sum + entry.members.length, 0);
    const outcome = { onSuccess: () => setFailure(null), onError: setFailure };

    return (
        <div className="space-y-4">
            <section className="space-y-3 rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base">
                        {t('tournamentDraft.entriesTitle', { count: tournament.entries.length })}
                    </h3>
                    {manage && (
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                                <UserPlus />
                                {teams
                                    ? t('tournamentDraft.addTeam')
                                    : t('tournamentDraft.addPlayer')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={tournament.entries.length < 2 || draw.isPending}
                                onClick={() => draw.mutate(false, outcome)}
                            >
                                <Shuffle />
                                {t('tournamentDraft.shuffle')}
                            </Button>
                            {teams && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!canDealTeams(tournament) || draw.isPending}
                                    onClick={() => setDealing(true)}
                                >
                                    <Users />
                                    {t('tournamentDraft.randomTeams')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
                <DraftPreview groupId={groupId} tournament={tournament} />
                {failure !== null && (
                    <FormMessage tone="error">{t(tournamentErrorKey(failure))}</FormMessage>
                )}
            </section>

            {manage ? (
                <section className="space-y-2 rounded-2xl border bg-card p-4">
                    <Button
                        className="w-full sm:w-auto"
                        disabled={tournament.startProblem !== null || start.isPending}
                        onClick={() => start.mutate(undefined, outcome)}
                    >
                        <Play />
                        {t('tournamentDraft.start')}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        {tournament.startProblem === null
                            ? t('tournamentDraft.startHelp')
                            : t(`tournamentProblems.${tournament.startProblem}`)}
                    </p>
                </section>
            ) : (
                <p className="text-sm text-muted-foreground">{t('tournamentDraft.waiting')}</p>
            )}

            {manage && (
                <AddEntryDialog
                    groupId={groupId}
                    tournament={tournament}
                    open={adding}
                    onOpenChange={setAdding}
                />
            )}
            <ConfirmDialog
                open={dealing}
                onOpenChange={setDealing}
                title={t('tournamentDraft.randomTeamsTitle')}
                description={t('tournamentDraft.randomTeamsDescription', {
                    people,
                    teams: randomTeamCount(people, tournament.teamSize ?? 1),
                })}
                confirmLabel={t('tournamentDraft.randomTeams')}
                pending={draw.isPending}
                onConfirm={() =>
                    draw.mutate(true, {
                        onSuccess: () => {
                            setFailure(null);
                            setDealing(false);
                        },
                        onError: (error) => {
                            setFailure(error);
                            setDealing(false);
                        },
                    })
                }
            />
        </div>
    );
}
