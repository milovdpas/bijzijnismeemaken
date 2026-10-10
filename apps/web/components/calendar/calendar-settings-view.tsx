'use client';

import { DateTime } from 'luxon';
import { CalendarConnectionStatus, TIME_ZONE } from '@bzim/types';
import type { CalendarConnectionDto } from '@bzim/types';
import { ArrowLeft, CalendarCheck, Link2, RefreshCw, Unplug } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CalendarEventsCard } from '@/components/calendar/calendar-events-card';
import { IgnoreRulesCard } from '@/components/calendar/ignore-rules-card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormMessage } from '@/components/common/form-message';
import { PageHeader } from '@/components/common/page-header';
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
import { Switch } from '@/components/ui/switch';
import {
    useCalendar,
    useDisconnectCalendar,
    useSyncCalendar,
    useUpdateCalendarSource,
} from '@/hooks/queries/use-calendar';
import { useMe, useUpdateMe } from '@/hooks/queries/use-me';
import { calendarConnectUrl } from '@/lib/api/calendar';
import { errorKey } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format-date';

/** The connection card: who is connected, how it is doing, and the three things to do about it. */
function ConnectionCard({ connection }: { connection: CalendarConnectionDto }) {
    const { t, i18n } = useTranslation();
    const sync = useSyncCalendar();
    const disconnect = useDisconnectCalendar();
    const me = useMe();
    const updateMe = useUpdateMe();
    const [confirming, setConfirming] = useState(false);
    const needsReauth = connection.status === CalendarConnectionStatus.REAUTH_REQUIRED;
    const autoAdd = me.data?.autoAddToCalendar === true && connection.hasWriteScope;
    // Turning it on without the write scope means asking Google for it first;
    // the callback switches the setting on once the grant is in.
    const toggleAutoAdd = (on: boolean) => {
        if (on && !connection.hasWriteScope) {
            window.location.assign(calendarConnectUrl('readwrite'));
            return;
        }
        updateMe.mutate({ autoAddToCalendar: on });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="size-4 text-muted-foreground" />
                    {t('calendarSettings.connectedTitle')}
                </CardTitle>
                <CardDescription>{connection.accountEmail}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge
                        variant="outline"
                        className={needsReauth ? 'border-destructive text-destructive' : ''}
                    >
                        {t(`calendarSettings.status.${connection.status}`)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {connection.lastSyncedAt === null
                            ? t('calendarSettings.neverSynced')
                            : t('calendarSettings.lastSynced', {
                                  when: formatDateTime(connection.lastSyncedAt, i18n.language),
                              })}
                    </span>
                </div>
                <label className="flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5">
                    <span>
                        <span className="block text-sm font-semibold">
                            {t('calendarSettings.autoAdd')}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                            {connection.hasWriteScope
                                ? t('calendarSettings.autoAddHelp')
                                : t('calendarSettings.autoAddNeedsScope')}
                        </span>
                    </span>
                    <Switch
                        checked={autoAdd}
                        disabled={updateMe.isPending || needsReauth}
                        onCheckedChange={toggleAutoAdd}
                    />
                </label>
                {updateMe.isError && (
                    <FormMessage tone="error">{t(errorKey(updateMe.error))}</FormMessage>
                )}
                {needsReauth && (
                    <FormMessage tone="error">
                        {t('calendarSettings.reauthHelp')}{' '}
                        <a
                            className="underline"
                            href={calendarConnectUrl(
                                connection.hasWriteScope ? 'readwrite' : 'read',
                            )}
                        >
                            {t('calendarSettings.reconnect')}
                        </a>
                    </FormMessage>
                )}
                {connection.lastError !== null && (
                    <FormMessage tone="error">
                        {t('calendarSettings.lastError', { error: connection.lastError })}
                    </FormMessage>
                )}
                {sync.isError && <FormMessage tone="error">{t(errorKey(sync.error))}</FormMessage>}
            </CardContent>
            <CardFooter className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
                    <Unplug />
                    {t('calendarSettings.disconnect')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={sync.isPending || needsReauth}
                    onClick={() => sync.mutate()}
                >
                    <RefreshCw className={sync.isPending ? 'animate-spin' : undefined} />
                    {t('calendarSettings.syncNow')}
                </Button>
            </CardFooter>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={t('calendarSettings.disconnect')}
                description={t('calendarSettings.disconnectDescription')}
                confirmLabel={t('calendarSettings.disconnect')}
                destructive
                pending={disconnect.isPending}
                error={disconnect.isError ? t(errorKey(disconnect.error)) : null}
                onConfirm={() =>
                    disconnect.mutate(undefined, { onSuccess: () => setConfirming(false) })
                }
            />
        </Card>
    );
}

/** Which of the account's calendars count. The primary one is on from the start. */
function SourcesCard({ connection }: { connection: CalendarConnectionDto }) {
    const { t } = useTranslation();
    const update = useUpdateCalendarSource();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('calendarSettings.sourcesTitle')}</CardTitle>
                <CardDescription>{t('calendarSettings.sourcesDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="divide-y">
                    {connection.sources.map((source) => (
                        <li key={source.id} className="flex items-center gap-3 py-2.5">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">
                                    {source.name}
                                </span>
                                {source.isPrimary && (
                                    <span className="block text-xs text-muted-foreground">
                                        {t('calendarSettings.primary')}
                                    </span>
                                )}
                            </span>
                            <Switch
                                checked={source.enabled}
                                disabled={update.isPending}
                                aria-label={source.name}
                                onCheckedChange={(enabled) =>
                                    update.mutate({ sourceId: source.id, enabled })
                                }
                            />
                        </li>
                    ))}
                </ul>
                {update.isError && (
                    <FormMessage tone="error">{t(errorKey(update.error))}</FormMessage>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Google Calendar settings: connect, pick calendars, sync, see what was
 * synced and keep events out of the count. The connect round trip ends on
 * this page with `connected` or `error` in the query.
 */
export function CalendarSettingsView() {
    const { t } = useTranslation();
    const params = useSearchParams();
    const calendar = useCalendar();
    const outcome = params.get('connected') === '1' ? 'connected' : params.get('error');
    const today = DateTime.now().setZone(TIME_ZONE).startOf('day');
    const from = today.toISODate() ?? '';
    const to = today.plus({ weeks: 4 }).toISODate() ?? '';

    return (
        <div className="mx-auto max-w-2xl">
            <Link
                href="/settings"
                className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="size-3.5" />
                {t('settings.title')}
            </Link>
            <PageHeader titleKey="calendarSettings.title" subtitleKey="calendarSettings.subtitle" />

            {outcome === 'connected' && (
                <FormMessage tone="success" className="mb-4">
                    {t('calendarSettings.connected')}
                </FormMessage>
            )}
            {outcome !== null && outcome !== 'connected' && (
                <FormMessage tone="error" className="mb-4">
                    {t(`calendarSettings.connectErrors.${outcome}`, {
                        defaultValue: t('calendarSettings.connectErrors.provider'),
                    })}
                </FormMessage>
            )}

            {calendar.isPending && <div className="h-40 animate-pulse rounded-2xl bg-muted" />}
            {calendar.isError && (
                <FormMessage tone="error">{t(errorKey(calendar.error))}</FormMessage>
            )}
            {calendar.data === null && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="size-4 text-muted-foreground" />
                            {t('calendarSettings.connectTitle')}
                        </CardTitle>
                        <CardDescription>
                            {t('calendarSettings.connectDescription')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs text-muted-foreground">
                        <p>{t('calendarSettings.privacy')}</p>
                        <p>{t('calendarSettings.freeHint')}</p>
                    </CardContent>
                    <CardFooter className="justify-end">
                        <Button
                            nativeButton={false}
                            render={<a href={calendarConnectUrl('read')} />}
                        >
                            {t('calendarSettings.connectGoogle')}
                        </Button>
                    </CardFooter>
                </Card>
            )}
            {calendar.data !== null && calendar.data !== undefined && (
                <div className="grid gap-4">
                    <ConnectionCard connection={calendar.data} />
                    <SourcesCard connection={calendar.data} />
                    <CalendarEventsCard from={from} to={to} />
                    <IgnoreRulesCard />
                </div>
            )}
        </div>
    );
}
