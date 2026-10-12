'use client';

import { CalendarCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { AddFeedForm } from '@/components/calendar/add-feed-form';
import { ConnectChoice } from '@/components/calendar/connect-choice';
import { FeedHelp } from '@/components/calendar/feed-help';
import { StepShell } from '@/components/onboarding/step-shell';
import { Button } from '@/components/ui/button';
import { useCalendar, useCalendarFeeds } from '@/hooks/queries/use-calendar';
import { useMarkSetup } from '@/hooks/queries/use-me';
import { errorKey } from '@/lib/api/errors';

const NEXT = '/welcome/availability';

/**
 * Step two of three, skippable: connect a Google Calendar, or add Apple's
 * or Outlook's by its link. Connecting Google goes through the API's round
 * trip and comes back on the next step; the API marks this step seen the
 * moment the connect starts. A link is added in place.
 */
export function CalendarStep() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const calendar = useCalendar();
    const feeds = useCalendarFeeds();
    const mark = useMarkSetup();
    const google = calendar.data !== null && calendar.data !== undefined;
    const linked = (feeds.data ?? []).map((feed) => feed.name);
    const connected = google || linked.length > 0;

    const next = () => mark.mutate('calendar', { onSuccess: () => router.push(NEXT) });

    return (
        <StepShell
            step={2}
            of={3}
            titleKey="welcome.calendarTitle"
            subtitleKey="welcome.calendarSubtitle"
        >
            <div className="space-y-4 rounded-2xl border bg-card p-5">
                <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                        <CalendarCheck className="size-5" />
                    </span>
                    <div className="space-y-2 text-sm">
                        <p>{t('calendarSettings.privacy')}</p>
                        <p className="text-muted-foreground">{t('calendarSettings.freeHint')}</p>
                        {google && (
                            <p className="font-semibold">
                                {t('welcome.calendarConnected', {
                                    email: calendar.data?.accountEmail ?? '',
                                })}
                            </p>
                        )}
                        {linked.length > 0 && (
                            <p className="font-semibold">
                                {t('welcome.calendarLinked', {
                                    names: new Intl.ListFormat(i18n.language, {
                                        type: 'conjunction',
                                    }).format(linked),
                                })}
                            </p>
                        )}
                    </div>
                </div>
                {!google && <ConnectChoice returnTo={NEXT} />}
                <div className="space-y-3 border-t pt-4">
                    <p className="text-sm font-semibold">{t('welcome.calendarFeedTitle')}</p>
                    <AddFeedForm />
                    <FeedHelp />
                </div>
                {mark.isError && <FormMessage tone="error">{t(errorKey(mark.error))}</FormMessage>}
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" disabled={mark.isPending} onClick={next}>
                        {connected ? t('welcome.next') : t('welcome.skip')}
                    </Button>
                </div>
            </div>
        </StepShell>
    );
}
