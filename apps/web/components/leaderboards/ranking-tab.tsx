'use client';

import { LeaderboardPeriod } from '@bzim/types';
import type { LeaderboardDetailDto, LeaderboardMemberDto, ScoreEntryDto } from '@bzim/types';
import { Minus, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { FormMessage } from '@/components/common/form-message';
import { Pagination } from '@/components/common/pagination';
import { AddScoreDialog } from '@/components/leaderboards/add-score-dialog';
import { ScoreDialog } from '@/components/leaderboards/score-dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePeriods, useScores } from '@/hooks/queries/use-leaderboards';
import { useScoreEntry } from '@/hooks/use-score-entry';
import { errorKey, refusalKey } from '@/lib/api/errors';
import { formatMonth } from '@/lib/format-date';
import { currentPeriod, enabledPeriods, periodChoices, scopeFor } from '@/lib/leaderboard-periods';
import { formatScore } from '@/lib/score-format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

/**
 * The rankings: one tab per period the board shows, a month or year picker
 * where that applies, the ranked page and the viewer's own place. For the
 * current period only, since the past is read-only, the score controls: an
 * "add score" button that also puts new people on the board, a pencil per
 * row, and the steppers when the board wants them.
 */
export function RankingTab({
    groupId,
    leaderboard,
}: {
    groupId: string;
    leaderboard: LeaderboardDetailDto;
}) {
    const { t, i18n } = useTranslation();
    const periods = enabledPeriods(leaderboard);
    const now = currentPeriod();
    const [period, setPeriod] = useState<LeaderboardPeriod>(leaderboard.cardPeriod);
    const [year, setYear] = useState(now.year);
    const [month, setMonth] = useState(now.month);
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<{
        member: LeaderboardMemberDto;
        score: number;
    } | null>(null);
    const [adding, setAdding] = useState(false);

    const available = usePeriods(groupId, leaderboard.id);
    const scope = scopeFor(period, year, month);
    const scores = useScores(groupId, leaderboard.id, { ...scope, page, pageSize: PAGE_SIZE });
    const entry = useScoreEntry(
        groupId,
        leaderboard,
        scope,
        scores.data?.items[0]?.member.id ?? null,
    );

    const isCurrent =
        period === LeaderboardPeriod.TOTAL ||
        (year === now.year && (period === LeaderboardPeriod.YEARLY || month === now.month));
    const canEnter = leaderboard.canEditScores && isCurrent;
    const choices = periodChoices(period, available.data, now);
    const scored = new Set((scores.data?.items ?? []).map((item) => item.member.id));

    const choose = (next: LeaderboardPeriod) => {
        setPeriod(next);
        setPage(1);
    };
    const saveFor = (member: LeaderboardMemberDto, score: number) =>
        entry.save(
            {
                kind: 'member',
                memberId: member.id,
                name: member.displayName,
                avatarKey: member.avatarKey,
            },
            score,
            () => setEditing(null),
        );

    const row = (item: ScoreEntryDto) => (
        <li key={item.member.id} className="flex items-center gap-3 py-2">
            <span
                className={cn(
                    'w-7 shrink-0 text-center text-sm font-bold tabular-nums',
                    item.rank === 1 ? 'text-ink' : 'text-muted-foreground',
                )}
            >
                {item.rank}
            </span>
            <Avatar avatarKey={item.member.avatarKey} size="sm" gold={item.rank === 1} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {item.member.displayName}
            </span>
            {canEnter && leaderboard.showSteppers && (
                <Button
                    size="icon-xs"
                    variant="outline"
                    disabled={entry.busy || item.score === 0}
                    aria-label={t('ranking.minusOne', { name: item.member.displayName })}
                    onClick={() => entry.step(item.member.id, -1)}
                >
                    <Minus />
                </Button>
            )}
            <span
                className={cn(
                    'shrink-0 text-sm font-bold tabular-nums',
                    // Between two steppers the number sits centred, the same gap on either side.
                    canEnter && leaderboard.showSteppers
                        ? 'w-14 text-center'
                        : 'min-w-12 text-right',
                )}
            >
                {formatScore(item.score, leaderboard.scoreType, i18n.language)}
            </span>
            {canEnter && leaderboard.showSteppers && (
                <Button
                    size="icon-xs"
                    variant="outline"
                    disabled={entry.busy}
                    aria-label={t('ranking.plusOne', { name: item.member.displayName })}
                    onClick={() => entry.step(item.member.id, 1)}
                >
                    <Plus />
                </Button>
            )}
            {canEnter && (
                <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t('ranking.edit', { name: item.member.displayName })}
                    onClick={() => setEditing({ member: item.member, score: item.score })}
                >
                    <Pencil />
                </Button>
            )}
        </li>
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {periods.length > 1 ? (
                    <Tabs
                        value={period}
                        onValueChange={(value) => choose(value as LeaderboardPeriod)}
                    >
                        <TabsList>
                            {periods.map((option) => (
                                <TabsTrigger key={option} value={option}>
                                    {t(`periods.${option}`)}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                        {t(`periods.${period}`)}
                    </span>
                )}
                {canEnter && (
                    <Button size="sm" onClick={() => setAdding(true)}>
                        <Plus />
                        {t('ranking.addScore')}
                    </Button>
                )}
            </div>

            {period !== LeaderboardPeriod.TOTAL && (
                <Select
                    value={
                        period === LeaderboardPeriod.MONTHLY
                            ? `${String(year)}-${String(month)}`
                            : String(year)
                    }
                    onValueChange={(value) => {
                        if (value === null) return;
                        const [y, m] = value.split('-').map(Number);
                        setYear(y ?? now.year);
                        if (m !== undefined) setMonth(m);
                        setPage(1);
                    }}
                    items={choices.map((choice) => ({
                        value: choice.value,
                        label:
                            choice.month === null
                                ? String(choice.year)
                                : formatMonth(choice.year, choice.month, i18n.language),
                    }))}
                >
                    <SelectTrigger className="w-full sm:w-56" aria-label={t('ranking.period')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {choices.map((choice) => (
                            <SelectItem key={choice.value} value={choice.value}>
                                {choice.month === null
                                    ? String(choice.year)
                                    : formatMonth(choice.year, choice.month, i18n.language)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {scores.isPending && <div className="h-32 animate-pulse rounded-xl bg-muted" />}
            {scores.isError && <FormMessage tone="error">{t(errorKey(scores.error))}</FormMessage>}
            {scores.data !== undefined && (
                <div className={cn(scores.isPlaceholderData && 'opacity-60')}>
                    {scores.data.items.length === 0 ? (
                        <p className="py-2 text-sm text-muted-foreground">
                            {canEnter
                                ? t('ranking.emptyCurrent')
                                : isCurrent
                                  ? t('ranking.emptyCurrentReadOnly')
                                  : t('ranking.emptyPast')}
                        </p>
                    ) : (
                        <ol className="divide-y">{scores.data.items.map(row)}</ol>
                    )}
                    {scores.data.me !== null && (
                        <p className="mt-2 text-xs font-semibold text-muted-foreground">
                            {t('ranking.me', {
                                rank: scores.data.me.rank,
                                score: formatScore(
                                    scores.data.me.score,
                                    leaderboard.scoreType,
                                    i18n.language,
                                ),
                            })}
                        </p>
                    )}
                    <Pagination
                        page={page}
                        hasMore={scores.data.hasMore}
                        onPageChange={setPage}
                        className="mt-3"
                    />
                </div>
            )}
            {entry.error !== null && editing === null && !adding && (
                <FormMessage tone="error">
                    {t(refusalKey(entry.error, 'leaderboardProblems'))}
                </FormMessage>
            )}

            {editing !== null && (
                <ScoreDialog
                    key={editing.member.id}
                    name={editing.member.displayName}
                    avatarKey={editing.member.avatarKey}
                    scoreType={leaderboard.scoreType}
                    current={editing.score}
                    open
                    onOpenChange={(open) => {
                        if (!open) setEditing(null);
                    }}
                    pending={entry.busy}
                    error={
                        entry.error === null
                            ? null
                            : t(refusalKey(entry.error, 'leaderboardProblems'))
                    }
                    onSubmit={(score) =>
                        score === null
                            ? entry.clear(editing.member.id, () => setEditing(null))
                            : saveFor(editing.member, score)
                    }
                />
            )}
            {adding && (
                <AddScoreDialog
                    groupId={groupId}
                    leaderboard={leaderboard}
                    scoredMemberIds={scored}
                    open
                    onOpenChange={(open) => {
                        if (!open) setAdding(false);
                    }}
                    pending={entry.busy}
                    error={
                        entry.error === null
                            ? null
                            : t(refusalKey(entry.error, 'leaderboardProblems'))
                    }
                    onSubmit={(target, score) => entry.save(target, score, () => setAdding(false))}
                />
            )}
        </div>
    );
}
