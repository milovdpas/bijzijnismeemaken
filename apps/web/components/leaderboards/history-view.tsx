'use client';

import { ERROR_CODES } from '@bzim/types';
import type { ScoreHistoryDto } from '@bzim/types';
import { ArrowLeft, ArrowRight, History } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { EmptyState } from '@/components/common/empty-state';
import { FormMessage } from '@/components/common/form-message';
import { Pagination } from '@/components/common/pagination';
import { Button } from '@/components/ui/button';
import { useHistory, useLeaderboard } from '@/hooks/queries/use-leaderboards';
import { errorKey, isApiError } from '@/lib/api/errors';
import { formatDateTime, formatMonth } from '@/lib/format-date';
import { formatScore } from '@/lib/score-format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

/**
 * Every change on a board, newest first: who went from what to what, who
 * entered it, when, and for which month. A cleared score reads as a dash.
 */
export function HistoryView({
    groupId,
    leaderboardId,
}: {
    groupId: string;
    leaderboardId: string;
}) {
    const { t, i18n } = useTranslation();
    const [page, setPage] = useState(1);
    const board = useLeaderboard(groupId, leaderboardId);
    const history = useHistory(groupId, leaderboardId, page, PAGE_SIZE);
    const boardHref = `/groups/${groupId}/leaderboards/${leaderboardId}`;

    if (isApiError(board.error, ERROR_CODES.NOT_FOUND)) {
        return (
            <EmptyState
                icon={History}
                titleKey="leaderboardDetail.notFoundTitle"
                descriptionKey="leaderboardDetail.notFoundDescription"
            />
        );
    }
    if (board.isError) {
        return <FormMessage tone="error">{t(errorKey(board.error))}</FormMessage>;
    }
    if (board.data === undefined) {
        return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
    }
    const scoreType = board.data.scoreType;
    const show = (score: number | null) =>
        score === null ? '—' : formatScore(score, scoreType, i18n.language);

    const row = (item: ScoreHistoryDto) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5">
            <Avatar avatarKey={item.member.avatarKey} size="sm" />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                    {item.member.displayName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                    {t('history.by', {
                        name: item.changedByName,
                        when: formatDateTime(item.createdAt, i18n.language),
                    })}
                    {' · '}
                    {formatMonth(item.year, item.month, i18n.language)}
                </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-sm tabular-nums">
                <span className="text-muted-foreground">{show(item.oldScore)}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span
                    className={cn('font-bold', item.newScore === null && 'text-muted-foreground')}
                >
                    {show(item.newScore)}
                </span>
            </span>
        </li>
    );

    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Link
                href={boardHref}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-3.5" />
                {board.data.name}
            </Link>
            <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl">
                    <History className="size-5 text-muted-foreground" />
                    {t('history.title')}
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={boardHref} />}
                >
                    {t('history.toBoard')}
                </Button>
            </div>

            {history.isPending && <div className="h-64 animate-pulse rounded-2xl bg-muted" />}
            {history.isError && (
                <FormMessage tone="error">{t(errorKey(history.error))}</FormMessage>
            )}
            {history.data !== undefined &&
                (history.data.items.length === 0 ? (
                    <EmptyState
                        icon={History}
                        titleKey="history.emptyTitle"
                        descriptionKey="history.emptyDescription"
                    />
                ) : (
                    <div
                        className={cn(
                            'rounded-2xl border bg-card px-4',
                            history.isPlaceholderData && 'opacity-60',
                        )}
                    >
                        <ol className="divide-y">{history.data.items.map(row)}</ol>
                        <Pagination
                            page={page}
                            hasMore={history.data.hasMore}
                            onPageChange={setPage}
                            className="py-3"
                        />
                    </div>
                ))}
        </div>
    );
}
