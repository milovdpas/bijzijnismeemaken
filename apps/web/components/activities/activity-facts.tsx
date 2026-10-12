'use client';

import { DateTime } from 'luxon';
import { DateMode, TIME_ZONE } from '@bzim/types';
import type { ActivityDetailDto } from '@bzim/types';
import { CalendarDays, Clock, Coins, ExternalLink, MapPin, Repeat, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatPeriod } from '@/lib/format-date';

/** The activity's own facts as a compact list; a fact that is not set is not shown. */
export function ActivityFacts({ activity }: { activity: ActivityDetailDto }) {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;

    const when = (() => {
        if (activity.dateMode === DateMode.SPECIFIC && activity.specificDate !== null) {
            return DateTime.fromISO(activity.specificDate, { zone: TIME_ZONE })
                .setLocale(locale)
                .toFormat('cccc d LLLL yyyy');
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
        return null;
    })();
    const whenLine = [when, activity.startTime].filter((part) => part !== null).join(' · ');
    const dayparts =
        activity.preferredDayparts === null
            ? null
            : activity.preferredDayparts.map((daypart) => t(`dayparts.${daypart}`)).join(', ');
    const people =
        activity.minPeople !== null || activity.maxPeople !== null
            ? t('activityDetail.people', {
                  min: activity.minPeople ?? '–',
                  max: activity.maxPeople ?? '–',
              })
            : null;

    const facts: { icon: LucideIcon; text: string | null; href?: string | null }[] = [
        { icon: CalendarDays, text: whenLine === '' ? null : whenLine },
        { icon: Repeat, text: activity.isRecurring ? t('activities.recurring') : null },
        { icon: Clock, text: dayparts },
        {
            icon: Clock,
            text:
                activity.durationMinutes === null
                    ? null
                    : t('activityDetail.duration', { minutes: activity.durationMinutes }),
        },
        { icon: MapPin, text: activity.locationText, href: activity.locationUrl },
        { icon: Users, text: people },
        {
            icon: Coins,
            text:
                activity.costPerPerson === null
                    ? null
                    : t('activityDetail.cost', { amount: activity.costPerPerson.toFixed(2) }),
        },
        { icon: ExternalLink, text: activity.externalUrl, href: activity.externalUrl },
    ];
    const shown = facts.filter((fact) => fact.text !== null);
    if (shown.length === 0) return null;

    return (
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {shown.map(({ icon: Icon, text, href }, index) => (
                <li key={index} className="flex items-start gap-2">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {href !== undefined && href !== null ? (
                        <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate underline underline-offset-2"
                        >
                            {text}
                        </a>
                    ) : (
                        <span className="min-w-0 break-words">{text}</span>
                    )}
                </li>
            ))}
        </ul>
    );
}
