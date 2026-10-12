'use client';

import { CalendarConnectionStatus } from '@bzim/types';
import { CalendarCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useCalendar, useCalendarFeeds } from '@/hooks/queries/use-calendar';

/** Settings: where the calendars stand, Google and links, and the way to their own page. */
export function CalendarCard() {
    const { t } = useTranslation();
    const calendar = useCalendar();
    const feeds = useCalendarFeeds();
    const links = feeds.data?.length ?? 0;
    const nothing = calendar.data === null && links === 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="size-4 text-muted-foreground" />
                    {t('calendarSettings.title')}
                </CardTitle>
                <CardDescription>{t('calendarSettings.cardDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
                {nothing && (
                    <p className="text-muted-foreground">{t('calendarSettings.notConnected')}</p>
                )}
                {calendar.data !== null && calendar.data !== undefined && (
                    <p className="flex flex-wrap items-center gap-2">
                        <span className="truncate">{calendar.data.accountEmail}</span>
                        <Badge
                            variant="outline"
                            className={
                                calendar.data.status === CalendarConnectionStatus.ACTIVE
                                    ? ''
                                    : 'border-destructive text-destructive'
                            }
                        >
                            {t(`calendarSettings.status.${calendar.data.status}`)}
                        </Badge>
                    </p>
                )}
                {links > 0 && <p>{t('calendarFeeds.count', { count: links })}</p>}
            </CardContent>
            <CardFooter className="justify-end">
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/settings/calendar" />}
                >
                    {nothing ? t('calendarSettings.connectAny') : t('calendarSettings.manage')}
                    <ChevronRight />
                </Button>
            </CardFooter>
        </Card>
    );
}
