'use client';

import { DateTime } from 'luxon';
import { ActivityLabel, OccurrenceStatus, TIME_ZONE } from '@bzim/types';
import type {
    ActivityWidgetConfig,
    IdeasWidgetConfig,
    LeaderboardWidgetConfig,
    LinkWidgetConfig,
    NoteWidgetConfig,
    UpcomingWidgetConfig,
} from '@bzim/types';
import { ArrowUpRight, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { ActivityCard } from '@/components/activities/activity-card';
import { Avatar } from '@/components/common/avatar';
import { FormMessage } from '@/components/common/form-message';
import { WIDGET_ICONS } from '@/components/dashboard/widget-icons';
import { WidgetFrame } from '@/components/dashboard/widget-frame';
import { Button } from '@/components/ui/button';
import { useActivities, useActivity } from '@/hooks/queries/use-activities';
import { useGroupOccurrences } from '@/hooks/queries/use-availability';
import { useLeaderboard, useScores } from '@/hooks/queries/use-leaderboards';
import { errorKey } from '@/lib/api/errors';
import { CATEGORY_ICONS } from '@/lib/activity-categories';
import { rankIdeas } from '@/lib/dashboard';
import { describeOccurrence, todayIso } from '@/lib/occurrence-format';
import { formatScore } from '@/lib/score-format';
import { cn } from '@/lib/utils';

/*
 * One component per widget type. Each loads its own data through the
 * endpoints that exist already; the dashboard only hands it the config and
 * the frame's edit toolbar. A widget whose data fails says so in its frame
 * rather than taking the dashboard down with it.
 */

interface WidgetProps<TConfig> {
    groupId: string;
    config: TConfig;
    toolbar?: React.ReactNode;
}

function Skeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="h-9 animate-pulse rounded-lg bg-muted" />
            ))}
        </div>
    );
}

export function UpcomingWidget({ groupId, config, toolbar }: WidgetProps<UpcomingWidgetConfig>) {
    const { t, i18n } = useTranslation();
    const from = todayIso();
    const to =
        DateTime.fromISO(from, { zone: TIME_ZONE }).plus({ weeks: config.weeks }).toISODate() ??
        from;
    const occurrences = useGroupOccurrences(groupId, from, to);
    const planned = (occurrences.data ?? [])
        .filter((occurrence) => occurrence.status === OccurrenceStatus.PLANNED)
        .sort(
            (a, b) =>
                a.date.localeCompare(b.date) ||
                (a.startTime ?? '').localeCompare(b.startTime ?? ''),
        );

    return (
        <WidgetFrame
            icon={WIDGET_ICONS.upcoming}
            title={t('widgets.upcoming.title', { count: config.weeks })}
            toolbar={toolbar}
            action={
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/groups/${groupId}/activities`} />}
                >
                    {t('widgets.all')}
                </Button>
            }
        >
            {occurrences.isPending && <Skeleton />}
            {occurrences.isError && (
                <FormMessage tone="error">{t(errorKey(occurrences.error))}</FormMessage>
            )}
            {occurrences.data !== undefined &&
                (planned.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('widgets.upcoming.empty')}</p>
                ) : (
                    <ul className="divide-y">
                        {planned.map((occurrence) => {
                            const Icon = CATEGORY_ICONS[occurrence.activity.category];
                            return (
                                <li key={occurrence.id}>
                                    <Link
                                        href={`/groups/${groupId}/activities/${occurrence.activity.id}`}
                                        className="flex items-center gap-3 py-2 hover:text-ink"
                                    >
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <Icon className="size-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold">
                                                {occurrence.activity.title}
                                            </span>
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {describeOccurrence(
                                                    occurrence.date,
                                                    occurrence.daypart,
                                                    occurrence.startTime,
                                                    i18n.language,
                                                    (daypart) => t(`dayparts.${daypart}`),
                                                    'ccc d LLL',
                                                )}
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 -space-x-2">
                                            {occurrence.participants.slice(0, 4).map((user) => (
                                                <Avatar
                                                    key={user.id}
                                                    avatarKey={user.avatarKey}
                                                    size="sm"
                                                    className="ring-2 ring-card"
                                                />
                                            ))}
                                            {occurrence.participants.length > 4 && (
                                                <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-xs font-semibold ring-2 ring-card">
                                                    +{occurrence.participants.length - 4}
                                                </span>
                                            )}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                ))}
        </WidgetFrame>
    );
}

export function IdeasWidget({ groupId, config, toolbar }: WidgetProps<IdeasWidgetConfig>) {
    const { t } = useTranslation();
    const activities = useActivities(groupId, { label: ActivityLabel.IDEA, sort: 'newest' });
    const ideas = rankIdeas(activities.data ?? [], config.limit);

    return (
        <WidgetFrame
            icon={WIDGET_ICONS.ideas}
            title={t('widgets.ideas.title')}
            toolbar={toolbar}
            action={
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/groups/${groupId}/activities`} />}
                >
                    {t('widgets.all')}
                </Button>
            }
        >
            {activities.isPending && <Skeleton />}
            {activities.isError && (
                <FormMessage tone="error">{t(errorKey(activities.error))}</FormMessage>
            )}
            {activities.data !== undefined &&
                (ideas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('widgets.ideas.empty')}</p>
                ) : (
                    <ul className="divide-y">
                        {ideas.map((activity) => {
                            const Icon = CATEGORY_ICONS[activity.category];
                            return (
                                <li key={activity.id}>
                                    <Link
                                        href={`/groups/${groupId}/activities/${activity.id}`}
                                        className="flex items-center gap-3 py-2 hover:text-ink"
                                    >
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <Icon className="size-4" />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                            {activity.title}
                                        </span>
                                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                                            <Users className="size-3.5" />
                                            {activity.interestCount}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                ))}
        </WidgetFrame>
    );
}

export function LeaderboardWidget({
    groupId,
    config,
    toolbar,
}: WidgetProps<LeaderboardWidgetConfig>) {
    const { t, i18n } = useTranslation();
    const board = useLeaderboard(groupId, config.leaderboardId);
    const scores = useScores(groupId, config.leaderboardId, {
        period: config.period,
        page: 1,
        pageSize: config.limit,
    });
    const href = `/groups/${groupId}/leaderboards/${config.leaderboardId}`;

    return (
        <WidgetFrame
            icon={WIDGET_ICONS.leaderboard}
            title={board.data?.name ?? t('widgets.leaderboard.title')}
            toolbar={toolbar}
            action={
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={href} />}
                >
                    {t(`periods.${config.period}`)}
                    <ArrowUpRight />
                </Button>
            }
        >
            {(board.isPending || scores.isPending) && <Skeleton />}
            {board.isError && <FormMessage tone="error">{t(errorKey(board.error))}</FormMessage>}
            {scores.isError && <FormMessage tone="error">{t(errorKey(scores.error))}</FormMessage>}
            {board.data !== undefined &&
                scores.data !== undefined &&
                (scores.data.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('leaderboards.noScores')}</p>
                ) : (
                    <ol className="grid gap-1.5">
                        {scores.data.items.map((entry) => (
                            <li key={entry.member.id} className="flex items-center gap-2 text-sm">
                                <span
                                    className={cn(
                                        'w-5 shrink-0 text-center text-xs font-bold tabular-nums',
                                        entry.rank === 1 ? 'text-ink' : 'text-muted-foreground',
                                    )}
                                >
                                    {entry.rank}
                                </span>
                                <Avatar
                                    avatarKey={entry.member.avatarKey}
                                    size="sm"
                                    gold={entry.rank === 1}
                                />
                                <span className="min-w-0 flex-1 truncate font-semibold">
                                    {entry.member.displayName}
                                </span>
                                <span className="shrink-0 font-bold tabular-nums">
                                    {formatScore(entry.score, board.data.scoreType, i18n.language)}
                                </span>
                            </li>
                        ))}
                    </ol>
                ))}
        </WidgetFrame>
    );
}

export function NoteWidget({ config, toolbar }: WidgetProps<NoteWidgetConfig>) {
    return (
        <WidgetFrame icon={WIDGET_ICONS.note} title={config.title} toolbar={toolbar}>
            {config.body === '' ? null : (
                <p className="text-sm whitespace-pre-line">{config.body}</p>
            )}
        </WidgetFrame>
    );
}

export function ActivityWidget({ groupId, config, toolbar }: WidgetProps<ActivityWidgetConfig>) {
    const { t } = useTranslation();
    const activity = useActivity(groupId, config.activityId);

    return (
        <WidgetFrame
            icon={WIDGET_ICONS.activity}
            title={t('widgets.activity.title')}
            toolbar={toolbar}
        >
            {activity.isPending && <Skeleton rows={2} />}
            {activity.isError && (
                <FormMessage tone="error">{t(errorKey(activity.error))}</FormMessage>
            )}
            {activity.data !== undefined && (
                <ActivityCard
                    activity={activity.data}
                    href={`/groups/${groupId}/activities/${activity.data.id}`}
                />
            )}
        </WidgetFrame>
    );
}

export function LinkWidget({ config, toolbar }: WidgetProps<LinkWidgetConfig>) {
    const { t } = useTranslation();
    const host = (() => {
        try {
            return new URL(config.url).host;
        } catch {
            return config.url;
        }
    })();

    return (
        <WidgetFrame icon={WIDGET_ICONS.link} title={t('widgets.link.title')} toolbar={toolbar}>
            <a
                href={config.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl border px-3 py-2.5 hover:bg-accent"
            >
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{config.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{host}</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
            </a>
        </WidgetFrame>
    );
}
