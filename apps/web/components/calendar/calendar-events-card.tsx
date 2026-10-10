'use client';

import { DateTime } from 'luxon';
import { CalendarIgnoreRuleKind, TIME_ZONE } from '@bzim/types';
import type { CalendarEventDto } from '@bzim/types';
import { EyeOff, Repeat } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAddIgnoreRule, useCalendarEvents, useIgnoreRules } from '@/hooks/queries/use-calendar';
import { errorKey } from '@/lib/api/errors';

/** "di 3 nov · 09:00–10:00", or the date alone for an all-day event. */
function describe(event: CalendarEventDto, lang: string): string {
    const start = DateTime.fromISO(event.startAt, { zone: TIME_ZONE }).setLocale(lang);
    const end = DateTime.fromISO(event.endAt, { zone: TIME_ZONE }).setLocale(lang);
    if (event.allDay) {
        const last = end.minus({ days: 1 });
        return last.hasSame(start, 'day')
            ? start.toFormat('ccc d LLL')
            : `${start.toFormat('ccc d LLL')} – ${last.toFormat('ccc d LLL')}`;
    }
    return `${start.toFormat('ccc d LLL · HH:mm')}–${end.toFormat('HH:mm')}`;
}

/**
 * The person's own synced events for the next weeks, titles and all, so
 * they can see what counts and keep an event or a whole series out of it.
 */
export function CalendarEventsCard({ from, to }: { from: string; to: string }) {
    const { t, i18n } = useTranslation();
    const events = useCalendarEvents(from, to);
    const rules = useIgnoreRules();
    const add = useAddIgnoreRule();
    const ignoredTitles = new Set(
        (rules.data ?? [])
            .filter((rule) => rule.kind === CalendarIgnoreRuleKind.TITLE)
            .map((rule) => rule.value),
    );
    const ignoredSeries = new Set(
        (rules.data ?? [])
            .filter((rule) => rule.kind === CalendarIgnoreRuleKind.SERIES)
            .map((rule) => rule.value),
    );
    const isIgnored = (event: CalendarEventDto) =>
        ignoredTitles.has(event.title.trim().toLowerCase()) ||
        (event.recurringEventId !== null && ignoredSeries.has(event.recurringEventId));

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('calendarSettings.eventsTitle')}</CardTitle>
                <CardDescription>{t('calendarSettings.eventsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                {events.isPending && <div className="h-24 animate-pulse rounded-xl bg-muted" />}
                {events.isError && (
                    <FormMessage tone="error">{t(errorKey(events.error))}</FormMessage>
                )}
                {events.data !== undefined &&
                    (events.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {t('calendarSettings.noEvents')}
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {events.data.map((event) => {
                                const ignored = isIgnored(event);
                                return (
                                    <li key={event.id} className="flex items-center gap-3 py-2">
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                                <span
                                                    className={`truncate text-sm font-semibold ${ignored ? 'text-muted-foreground line-through' : ''}`}
                                                >
                                                    {event.title === ''
                                                        ? t('calendarSettings.untitled')
                                                        : event.title}
                                                </span>
                                                {event.transparent && (
                                                    <Badge variant="outline">
                                                        {t('calendarSettings.free')}
                                                    </Badge>
                                                )}
                                            </span>
                                            <span className="block text-xs text-muted-foreground">
                                                {describe(event, i18n.language)}
                                            </span>
                                        </span>
                                        {!ignored && event.title !== '' && (
                                            <Button
                                                size="icon-xs"
                                                variant="ghost"
                                                disabled={add.isPending}
                                                aria-label={t('calendarSettings.ignoreTitle', {
                                                    title: event.title,
                                                })}
                                                title={t('calendarSettings.ignoreTitle', {
                                                    title: event.title,
                                                })}
                                                onClick={() =>
                                                    add.mutate({
                                                        kind: CalendarIgnoreRuleKind.TITLE,
                                                        value: event.title,
                                                        label: event.title,
                                                    })
                                                }
                                            >
                                                <EyeOff />
                                            </Button>
                                        )}
                                        {!ignored && event.recurringEventId !== null && (
                                            <Button
                                                size="icon-xs"
                                                variant="ghost"
                                                disabled={add.isPending}
                                                aria-label={t('calendarSettings.ignoreSeries', {
                                                    title: event.title,
                                                })}
                                                title={t('calendarSettings.ignoreSeries', {
                                                    title: event.title,
                                                })}
                                                onClick={() =>
                                                    add.mutate({
                                                        kind: CalendarIgnoreRuleKind.SERIES,
                                                        value: event.recurringEventId ?? '',
                                                        label:
                                                            event.title === ''
                                                                ? t('calendarSettings.untitled')
                                                                : event.title,
                                                    })
                                                }
                                            >
                                                <Repeat />
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    ))}
                {add.isError && <FormMessage tone="error">{t(errorKey(add.error))}</FormMessage>}
            </CardContent>
        </Card>
    );
}
