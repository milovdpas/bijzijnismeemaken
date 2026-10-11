'use client';

import { DateTime } from 'luxon';
import { TIME_ZONE } from '@bzim/types';
import type { Daypart, Weekday } from '@bzim/types';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { WeekGrid } from '@/components/availability/week-grid';
import { FormMessage } from '@/components/common/form-message';
import { StepShell } from '@/components/onboarding/step-shell';
import { Button } from '@/components/ui/button';
import { useCreateRule, useDeleteRule, useRules } from '@/hooks/queries/use-availability';
import { useMarkSetup } from '@/hooks/queries/use-me';
import { errorKey } from '@/lib/api/errors';

/**
 * Step three of three, skippable: the week schedule from the availability
 * page, so the fixed commitments are in before the first group asks.
 */
export function AvailabilityStep() {
    const { t } = useTranslation();
    const router = useRouter();
    const rules = useRules();
    const createRule = useCreateRule();
    const deleteRule = useDeleteRule();
    const mark = useMarkSetup();
    const todayWeekday = DateTime.now().setZone(TIME_ZONE).weekday as Weekday;

    const toggleRule = (weekday: Weekday, daypart: Daypart, busy: boolean) => {
        if (busy) {
            createRule.mutate({ weekday, daypart });
            return;
        }
        for (const rule of rules.data ?? []) {
            if (rule.weekday === weekday && rule.daypart === daypart) deleteRule.mutate(rule.id);
        }
    };
    const error = createRule.error ?? deleteRule.error ?? mark.error;
    const finish = () => mark.mutate('availability', { onSuccess: () => router.push('/groups') });

    return (
        <StepShell
            step={3}
            of={3}
            titleKey="welcome.availabilityTitle"
            subtitleKey="welcome.availabilitySubtitle"
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('availability.weeklyHelp')}</p>
                {rules.data === undefined ? (
                    <div className="h-72 animate-pulse rounded-2xl bg-muted" />
                ) : (
                    <WeekGrid
                        rules={rules.data}
                        todayWeekday={todayWeekday}
                        pending={createRule.isPending || deleteRule.isPending}
                        onToggle={toggleRule}
                    />
                )}
                {error !== null && error !== undefined && (
                    <FormMessage tone="error">{t(errorKey(error))}</FormMessage>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" disabled={mark.isPending} onClick={finish}>
                        {t('welcome.skip')}
                    </Button>
                    <Button disabled={mark.isPending} onClick={finish}>
                        {t('welcome.finish')}
                    </Button>
                </div>
            </div>
        </StepShell>
    );
}
