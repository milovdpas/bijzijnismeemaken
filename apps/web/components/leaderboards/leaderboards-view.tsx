'use client';

import type { LeaderboardListingDto } from '@bzim/types';
import { Lock, Plus, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { LeaderboardCard } from '@/components/leaderboards/leaderboard-card';
import { Button } from '@/components/ui/button';
import { useLeaderboards } from '@/hooks/queries/use-leaderboards';
import { errorKey } from '@/lib/api/errors';

/**
 * The group's leaderboards, oldest first as the API lists them, then the
 * private ones the viewer is on, and a way to add one.
 */
export function LeaderboardsView({ groupId }: { groupId: string }) {
    const { t } = useTranslation();
    const leaderboards = useLeaderboards(groupId);
    const newHref = `/groups/${groupId}/leaderboards/new`;
    const grid = (boards: LeaderboardListingDto[]) => (
        <div className="grid gap-3 md:grid-cols-2">
            {boards.map((board) => (
                <LeaderboardCard
                    key={board.id}
                    leaderboard={board}
                    href={`/groups/${groupId}/leaderboards/${board.id}`}
                />
            ))}
        </div>
    );
    const shared = leaderboards.data?.filter((board) => !board.isPrivate) ?? [];
    const own = leaderboards.data?.filter((board) => board.isPrivate) ?? [];
    const newButton = (
        <Button nativeButton={false} render={<Link href={newHref} />}>
            <Plus className="size-4" />
            {t('leaderboards.new')}
        </Button>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-end">{newButton}</div>

            {leaderboards.isPending && (
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="h-24 animate-pulse rounded-2xl bg-muted" />
                    <div className="h-24 animate-pulse rounded-2xl bg-muted" />
                </div>
            )}
            {leaderboards.isError && (
                <FormMessage tone="error">{t(errorKey(leaderboards.error))}</FormMessage>
            )}
            {leaderboards.data !== undefined &&
                (leaderboards.data.length === 0 ? (
                    <EmptyState
                        icon={Trophy}
                        titleKey="leaderboards.emptyTitle"
                        descriptionKey="leaderboards.emptyDescription"
                        action={newButton}
                    />
                ) : (
                    <>
                        {shared.length > 0 && grid(shared)}
                        {own.length > 0 && (
                            <section className="space-y-3 pt-2">
                                <div>
                                    <h2 className="flex items-center gap-1.5 text-base">
                                        <Lock className="size-4" />
                                        {t('leaderboards.privateTitle')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {t('leaderboards.privateHelp')}
                                    </p>
                                </div>
                                {grid(own)}
                            </section>
                        )}
                    </>
                ))}
        </div>
    );
}
