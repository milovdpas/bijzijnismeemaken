'use client';

import { ERROR_CODES, TournamentStatus } from '@bzim/types';
import { ArrowLeft, Medal, Pencil, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { TournamentDraft } from '@/components/tournaments/tournament-draft';
import { TournamentMeta } from '@/components/tournaments/tournament-meta';
import { TournamentPlay } from '@/components/tournaments/tournament-play';
import { TournamentStatusBadge } from '@/components/tournaments/tournament-status-badge';
import { Button } from '@/components/ui/button';
import { useDeleteTournament, useTournament } from '@/hooks/queries/use-tournaments';
import { errorKey, isApiError } from '@/lib/api/errors';

/**
 * One tournament: a header with its settings and the organiser's actions,
 * then the draft screen while it is set up, or the matches once it runs.
 */
export function TournamentDetailView({
    groupId,
    tournamentId,
}: {
    groupId: string;
    tournamentId: string;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const tournament = useTournament(groupId, tournamentId);
    const remove = useDeleteTournament(groupId);
    const [deleting, setDeleting] = useState(false);
    const listHref = `/groups/${groupId}/tournaments`;

    if (isApiError(tournament.error, ERROR_CODES.NOT_FOUND)) {
        return (
            <EmptyState
                icon={Medal}
                titleKey="tournamentDetail.notFoundTitle"
                descriptionKey="tournamentDetail.notFoundDescription"
                action={
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={listHref} />}
                    >
                        <ArrowLeft className="size-4" />
                        {t('tournamentDetail.backToList')}
                    </Button>
                }
            />
        );
    }
    if (tournament.isError) {
        return <FormMessage tone="error">{t(errorKey(tournament.error))}</FormMessage>;
    }
    if (tournament.data === undefined) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
                <div className="h-32 animate-pulse rounded-2xl bg-muted" />
                <div className="h-48 animate-pulse rounded-2xl bg-muted" />
            </div>
        );
    }

    const data = tournament.data;
    return (
        <div className="space-y-4">
            <Link
                href={listHref}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-3.5" />
                {t('tournamentDetail.backToList')}
            </Link>

            <header className="space-y-3 rounded-2xl border bg-card p-4">
                <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                        <Medal className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl md:text-2xl">{data.name}</h2>
                            <TournamentStatusBadge status={data.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('tournamentDetail.by', {
                                name: data.organiserName ?? t('tournamentDetail.unknownOrganiser'),
                            })}
                        </p>
                        <TournamentMeta tournament={data} className="mt-1" />
                    </div>
                    {data.canManage && (
                        <div className="flex shrink-0 gap-1">
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={t('tournamentDetail.edit')}
                                nativeButton={false}
                                render={<Link href={`${listHref}/${tournamentId}/edit`} />}
                            >
                                <Pencil />
                            </Button>
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={t('tournamentDetail.delete')}
                                onClick={() => setDeleting(true)}
                            >
                                <Trash2 />
                            </Button>
                        </div>
                    )}
                </div>
                {data.activity !== null && (
                    <Link
                        href={`/groups/${groupId}/activities/${data.activity.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                    >
                        <Sparkles className="size-4" />
                        {t('tournamentDetail.activity', { title: data.activity.title })}
                    </Link>
                )}
                {data.description !== null && (
                    <p className="text-sm whitespace-pre-line">{data.description}</p>
                )}
            </header>

            {data.status === TournamentStatus.DRAFT ? (
                <TournamentDraft groupId={groupId} tournament={data} />
            ) : (
                <TournamentPlay groupId={groupId} tournament={data} />
            )}

            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                title={t('tournamentDetail.delete')}
                description={t('tournamentDetail.deleteDescription', { name: data.name })}
                confirmLabel={t('tournamentDetail.delete')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() =>
                    remove.mutate(tournamentId, { onSuccess: () => router.push(listHref) })
                }
            />
        </div>
    );
}
