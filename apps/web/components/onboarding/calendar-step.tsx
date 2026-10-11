'use client';

import { CalendarCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { FormMessage } from '@/components/common/form-message';
import { StepShell } from '@/components/onboarding/step-shell';
import { Button } from '@/components/ui/button';
import { useCalendar } from '@/hooks/queries/use-calendar';
import { useMarkSetup } from '@/hooks/queries/use-me';
import { calendarConnectUrl } from '@/lib/api/calendar';
import { errorKey } from '@/lib/api/errors';

const NEXT = '/welcome/availability';

/**
 * Step two of three, skippable: connect a Google Calendar. Connecting goes
 * through the API's round trip and comes back on the next step; the API
 * marks this step seen the moment the connect starts.
 */
export function CalendarStep() {
    const { t } = useTranslation();
    const router = useRouter();
    const calendar = useCalendar();
    const mark = useMarkSetup();
    const connected = calendar.data !== null && calendar.data !== undefined;

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
                        {connected && (
                            <p className="font-semibold">
                                {t('welcome.calendarConnected', {
                                    email: calendar.data?.accountEmail ?? '',
                                })}
                            </p>
                        )}
                    </div>
                </div>
                {mark.isError && <FormMessage tone="error">{t(errorKey(mark.error))}</FormMessage>}
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" disabled={mark.isPending} onClick={next}>
                        {connected ? t('welcome.next') : t('welcome.skip')}
                    </Button>
                    {!connected && (
                        <Button
                            nativeButton={false}
                            render={<a href={calendarConnectUrl('read', NEXT)} />}
                        >
                            {t('calendarSettings.connectGoogle')}
                        </Button>
                    )}
                </div>
            </div>
        </StepShell>
    );
}
