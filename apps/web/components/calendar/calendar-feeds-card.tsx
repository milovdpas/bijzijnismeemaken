'use client';

import type { CalendarFeedDto } from '@bzim/types';
import { Link2, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AddFeedForm } from '@/components/calendar/add-feed-form';
import { FeedHelp } from '@/components/calendar/feed-help';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    useCalendarFeeds,
    useRemoveCalendarFeed,
    useSyncCalendarFeeds,
} from '@/hooks/queries/use-calendar';
import { errorKey, retryAfterSeconds } from '@/lib/api/errors';
import { feedOrigin } from '@/lib/calendar-feeds';
import { formatDateTime } from '@/lib/format-date';

/**
 * Calendars read through a link: Apple's, Outlook's, any other feed. Each
 * says where it comes from and how its last read went; links are added
 * with the form, read again with "Sync now", and removed one by one.
 */
export function CalendarFeedsCard() {
    const { t, i18n } = useTranslation();
    const feeds = useCalendarFeeds();
    const sync = useSyncCalendarFeeds();
    const remove = useRemoveCalendarFeed();
    const [removing, setRemoving] = useState<CalendarFeedDto | null>(null);
    const waitSeconds = retryAfterSeconds(sync.error);
    const list = feeds.data ?? [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Link2 className="size-4 text-muted-foreground" />
                    {t('calendarFeeds.title')}
                </CardTitle>
                <CardDescription>{t('calendarFeeds.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {feeds.isPending && <div className="h-12 animate-pulse rounded-xl bg-muted" />}
                {feeds.isError && (
                    <FormMessage tone="error">{t(errorKey(feeds.error))}</FormMessage>
                )}
                {list.length > 0 && (
                    <ul className="divide-y">
                        {list.map((feed) => (
                            <li key={feed.id} className="flex items-start gap-3 py-2.5">
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold">
                                        {feed.name}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                        {t(`calendarFeeds.origins.${feedOrigin(feed.host)}`)}
                                        {' · '}
                                        {feed.lastSyncedAt === null
                                            ? t('calendarSettings.neverSynced')
                                            : t('calendarSettings.lastSynced', {
                                                  when: formatDateTime(
                                                      feed.lastSyncedAt,
                                                      i18n.language,
                                                  ),
                                              })}
                                    </span>
                                    {feed.lastError !== null && (
                                        <span className="mt-1 block text-xs text-destructive">
                                            {t(`calendarFeeds.problems.${feed.lastError}`)}
                                        </span>
                                    )}
                                </span>
                                <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={t('calendarFeeds.remove', { name: feed.name })}
                                    onClick={() => setRemoving(feed)}
                                >
                                    <X />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
                <AddFeedForm />
                <FeedHelp />
                {sync.isError && (
                    <FormMessage tone="error">
                        {waitSeconds === null
                            ? t(errorKey(sync.error))
                            : t('calendarSettings.syncWait', {
                                  count: Math.ceil(waitSeconds / 60),
                              })}
                    </FormMessage>
                )}
            </CardContent>
            {list.length > 0 && (
                <CardFooter className="justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={sync.isPending}
                        onClick={() => sync.mutate()}
                    >
                        <RefreshCw className={sync.isPending ? 'animate-spin' : undefined} />
                        {t('calendarFeeds.syncNow')}
                    </Button>
                </CardFooter>
            )}
            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => {
                    if (!open) setRemoving(null);
                }}
                title={t('calendarFeeds.removeTitle')}
                description={t('calendarFeeds.removeDescription', { name: removing?.name ?? '' })}
                confirmLabel={t('calendarFeeds.removeConfirm')}
                destructive
                pending={remove.isPending}
                error={remove.isError ? t(errorKey(remove.error)) : null}
                onConfirm={() => {
                    if (removing !== null) {
                        remove.mutate(removing.id, { onSuccess: () => setRemoving(null) });
                    }
                }}
            />
        </Card>
    );
}
