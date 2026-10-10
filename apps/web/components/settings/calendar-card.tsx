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
import { useCalendar } from '@/hooks/queries/use-calendar';

/** Settings: where the calendar stands, and the way to its own page. */
export function CalendarCard() {
    const { t } = useTranslation();
    const calendar = useCalendar();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="size-4 text-muted-foreground" />
                    {t('calendarSettings.title')}
                </CardTitle>
                <CardDescription>{t('calendarSettings.cardDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
                {calendar.data === null && (
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
            </CardContent>
            <CardFooter className="justify-end">
                <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/settings/calendar" />}
                >
                    {calendar.data === null
                        ? t('calendarSettings.connectGoogle')
                        : t('calendarSettings.manage')}
                    <ChevronRight />
                </Button>
            </CardFooter>
        </Card>
    );
}
