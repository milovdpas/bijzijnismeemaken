'use client';

import { DateTime } from 'luxon';
import { ActivityLabel, DateMode, TIME_ZONE } from '@bzim/types';
import type { ActivityListingDto } from '@bzim/types';
import { Check, Repeat, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { CATEGORY_ICONS } from '@/lib/activity-categories';
import { cn } from '@/lib/utils';
import { formatPeriod } from '@/lib/format-date';

const LABEL_STYLE: Record<ActivityLabel, string> = {
    [ActivityLabel.IDEA]: 'border-border text-muted-foreground',
    [ActivityLabel.PLANNED]: 'border-transparent bg-free/30 text-foreground',
    [ActivityLabel.DONE]: 'border-transparent bg-muted text-muted-foreground',
};

/**
 * One activity in the list: its picture when it has one, kind, title, state,
 * and the one date fact that matters (the next planned moment, or the date
 * preference while it is an idea). The whole card opens the activity. A
 * picture that fails to load falls back to the category tile, so a dead
 * link never leaves a hole.
 */
export function ActivityCard({
    activity,
    href,
    className,
}: {
    activity: ActivityListingDto;
    href: string;
    className?: string;
}) {
    const { t, i18n } = useTranslation();
    const [imageBroken, setImageBroken] = useState(false);
    const Icon = CATEGORY_ICONS[activity.category];
    const locale = i18n.language;
    const image = activity.imageUrl !== null && !imageBroken ? activity.imageUrl : null;

    const when = (() => {
        const next = activity.nextOccurrence;
        if (next !== null) {
            const day = DateTime.fromISO(next.date, { zone: TIME_ZONE })
                .setLocale(locale)
                .toFormat('ccc d LLL');
            const time =
                next.startTime ?? (next.daypart === null ? '' : t(`dayparts.${next.daypart}`));
            return t('activities.nextOn', { when: time === '' ? day : `${day} · ${time}` });
        }
        if (activity.dateMode === DateMode.SPECIFIC && activity.specificDate !== null) {
            return DateTime.fromISO(activity.specificDate, { zone: TIME_ZONE })
                .setLocale(locale)
                .toFormat('ccc d LLL yyyy');
        }
        if (
            activity.dateMode === DateMode.PERIOD &&
            activity.periodStart !== null &&
            activity.periodEnd !== null
        ) {
            return t(
                'activities.between',
                formatPeriod(activity.periodStart, activity.periodEnd, locale),
            );
        }
        if (activity.dateMode === DateMode.WEEKDAY && activity.weekday !== null) {
            return t('activities.onWeekday', {
                weekday: DateTime.fromObject({ weekday: activity.weekday })
                    .setLocale(locale)
                    .toFormat('cccc'),
            });
        }
        return t('activities.noDate');
    })();

    return (
        <Link
            href={href}
            className={cn(
                'flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors hover:border-ink/40',
                className,
            )}
        >
            {image !== null && (
                /* eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host; next/image needs a fixed allow-list */
                <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="aspect-[2/1] w-full object-cover"
                    onError={() => setImageBroken(true)}
                />
            )}
            <span className="flex gap-3 p-4">
                <span
                    className={cn(
                        'flex shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground',
                        image === null ? 'size-11' : 'size-8',
                    )}
                >
                    <Icon className={image === null ? 'size-5' : 'size-4'} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-base font-bold">{activity.title}</span>
                        <Badge
                            variant="outline"
                            className={cn('shrink-0', LABEL_STYLE[activity.label])}
                        >
                            {t(`labels.${activity.label}`)}
                        </Badge>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {when}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                            <Users className="size-3.5" />
                            {t('activities.inCount', { count: activity.interestCount })}
                        </span>
                        {activity.iAmIn && (
                            <span className="inline-flex items-center gap-1 font-semibold text-ink">
                                <Check className="size-3.5" />
                                {t('activities.youAreIn')}
                            </span>
                        )}
                        {activity.isRecurring && (
                            <span className="inline-flex items-center gap-1">
                                <Repeat className="size-3.5" />
                                {t('activities.recurring')}
                            </span>
                        )}
                    </span>
                </span>
            </span>
        </Link>
    );
}
