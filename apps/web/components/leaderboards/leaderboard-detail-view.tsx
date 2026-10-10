'use client';

import { EditMode, ERROR_CODES, ScoreType } from '@bzim/types';
import { ArrowLeft, Hash, History, Pencil, Timer, Trash2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { PlayersTab } from '@/components/leaderboards/players-tab';
import { RankingTab } from '@/components/leaderboards/ranking-tab';
import { TimerTab } from '@/components/leaderboards/timer-tab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeleteLeaderboard, useLeaderboard } from '@/hooks/queries/use-leaderboards';
import { errorKey, isApiError } from '@/lib/api/errors';
import { enabledPeriods } from '@/lib/leaderboard-periods';

/**
 * One board: its settings in a header, then one card with two tabs, the
 * rankings per period with score entry and the players, plus a stopwatch
 * on a time board. The history page is its own route.
 */
export function LeaderboardDetailView({
    groupId,
    leaderboardId,
}: {
    groupId: string;
    leaderboardId: string;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const board = useLeaderboard(groupId, leaderboardId);
    const remove = useDeleteLeaderboard(groupId);
    const [deleting, setDeleting] = useState(false);
    const listHref = `/groups/${groupId}/leaderboards`;

    if (isApiError(board.error, ERROR_CODES.NOT_FOUND)) {
        return (
            <EmptyState
                icon={Trophy}
                titleKey="leaderboardDetail.notFoundTitle"
                descriptionKey="leaderboardDetail.notFoundDescription"
                action={
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={listHref} />}
                    >
                        <ArrowLeft className="size-4" />
                        {t('leaderboardDetail.backToList')}
                    </Button>
                }
            />
        );
    }
    if (board.isError) {
        return <FormMessage tone="error">{t(errorKey(board.error))}</FormMessage>;
    }
    if (board.data === undefined) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
                <div className="h-32 animate-pulse rounded-2xl bg-muted" />
                <div className="h-32 animate-pulse rounded-2xl bg-muted" />
            </div>
        );
    }

    const data = board.data;
    const Icon = data.scoreType === ScoreType.TIME ? Timer : Hash;
    const editorsLine = (() => {
        switch (data.editMode) {
            case EditMode.EVERYONE:
                return t('leaderboardDetail.editorsEveryone');
            case EditMode.CREATOR:
                return t('leaderboardDetail.editorsCreator', {
                    name: data.creatorName ?? t('leaderboardDetail.unknownCreator'),
                });
            case EditMode.SELECTED:
                return data.editors.length === 0
                    ? t('leaderboardDetail.editorsNone')
                    : t('leaderboardDetail.editorsSelected', {
                          names: data.editors.map((user) => user.displayName).join(', '),
                      });
        }
    })();

    return (
        <div className="space-y-4">
            <Link
                href={listHref}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-3.5" />
                {t('leaderboardDetail.backToList')}
            </Link>

            <header className="space-y-3 rounded-2xl border bg-card p-4">
                <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                        <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl md:text-2xl">{data.name}</h2>
                            <Badge variant="outline">{t(`scoreTypes.${data.scoreType}`)}</Badge>
                            <Badge variant="outline">{t(`sortOrders.${data.sortOrder}`)}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('leaderboardDetail.by', {
                                name: data.creatorName ?? t('leaderboardDetail.unknownCreator'),
                            })}
                        </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                        <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t('history.title')}
                            nativeButton={false}
                            render={<Link href={`${listHref}/${leaderboardId}/history`} />}
                        >
                            <History />
                        </Button>
                        {data.canManage && (
                            <>
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={t('leaderboards.edit')}
                                    nativeButton={false}
                                    render={<Link href={`${listHref}/${leaderboardId}/edit`} />}
                                >
                                    <Pencil />
                                </Button>
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={t('leaderboardDetail.delete')}
                                    onClick={() => setDeleting(true)}
                                >
                                    <Trash2 />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                {data.description !== null && (
                    <p className="text-sm whitespace-pre-line">{data.description}</p>
                )}
                <dl className="grid gap-1 text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-x-1.5">
                        <dt className="font-semibold">{t('leaderboardDetail.periodsLabel')}</dt>
                        <dd>
                            {enabledPeriods(data)
                                .map((period) => t(`periods.${period}`))
                                .join(' · ')}
                        </dd>
                    </div>
                    <div className="flex flex-wrap gap-x-1.5">
                        <dt className="font-semibold">{t('leaderboardDetail.editorsLabel')}</dt>
                        <dd>{editorsLine}</dd>
                    </div>
                </dl>
            </header>

            <Tabs defaultValue="ranking" className="rounded-2xl border bg-card p-4">
                <TabsList className="w-full">
                    <TabsTrigger value="ranking">{t('leaderboardDetail.tabRanking')}</TabsTrigger>
                    <TabsTrigger value="players">
                        {t('leaderboardDetail.tabPlayers', { count: data.memberCount })}
                    </TabsTrigger>
                    {data.scoreType === ScoreType.TIME && (
                        <TabsTrigger value="timer">{t('leaderboardDetail.tabTimer')}</TabsTrigger>
                    )}
                </TabsList>
                <TabsContent value="ranking" className="pt-3">
                    <RankingTab groupId={groupId} leaderboard={data} />
                </TabsContent>
                <TabsContent value="players" className="pt-3">
                    <PlayersTab groupId={groupId} leaderboard={data} />
                </TabsContent>
                {data.scoreType === ScoreType.TIME && (
                    <TabsContent value="timer" className="pt-3">
                        <TimerTab groupId={groupId} leaderboard={data} />
                    </TabsContent>
                )}
            </Tabs>

            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                title={t('leaderboardDetail.delete')}
                description={t('leaderboardDetail.deleteDescription', { name: data.name })}
                confirmLabel={t('leaderboardDetail.delete')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() =>
                    remove.mutate(leaderboardId, { onSuccess: () => router.push(listHref) })
                }
            />
        </div>
    );
}
