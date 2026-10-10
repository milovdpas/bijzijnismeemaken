'use client';

import { ScoreType } from '@bzim/types';
import type { LeaderboardListingDto } from '@bzim/types';
import { Hash, Timer, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common/avatar';
import { formatScore } from '@/lib/score-format';
import { cn } from '@/lib/utils';

/**
 * One board in the list: what it counts, who is on it, and the top of the
 * ranking it chose for its card. The whole card opens it.
 */
export function LeaderboardCard({
    leaderboard,
    href,
    className,
}: {
    leaderboard: LeaderboardListingDto;
    href: string;
    className?: string;
}) {
    const { t, i18n } = useTranslation();
    const Icon = leaderboard.scoreType === ScoreType.TIME ? Timer : Hash;

    return (
        <Link
            href={href}
            className={cn(
                'flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-ink/40',
                className,
            )}
        >
            <span className="flex gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                    <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold">{leaderboard.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                            <Users className="size-3.5" />
                            {t('leaderboards.memberCount', { count: leaderboard.memberCount })}
                        </span>
                        <span>{t(`periods.${leaderboard.cardPeriod}`)}</span>
                    </span>
                </span>
            </span>

            {leaderboard.top.length === 0 ? (
                <span className="text-sm text-muted-foreground">{t('leaderboards.noScores')}</span>
            ) : (
                <ol className="grid gap-1.5">
                    {leaderboard.top.map((entry) => (
                        <li key={entry.member.id} className="flex items-center gap-2 text-sm">
                            <span
                                className={cn(
                                    'w-5 shrink-0 text-center text-xs font-bold tabular-nums',
                                    entry.rank === 1 ? 'text-ink' : 'text-muted-foreground',
                                )}
                            >
                                {entry.rank}
                            </span>
                            <Avatar avatarKey={entry.member.avatarKey} size="sm" />
                            <span className="min-w-0 flex-1 truncate font-semibold">
                                {entry.member.displayName}
                            </span>
                            <span className="shrink-0 font-bold tabular-nums">
                                {formatScore(entry.score, leaderboard.scoreType, i18n.language)}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </Link>
    );
}
