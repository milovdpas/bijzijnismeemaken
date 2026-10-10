'use client';

import { DateTime } from 'luxon';
import { TIME_ZONE } from '@bzim/types';
import type { Daypart, Weekday } from '@bzim/types';
import { CalendarDays, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MonthGrid } from '@/components/availability/month-grid';
import { WeekGrid } from '@/components/availability/week-grid';
import { FormMessage } from '@/components/common/form-message';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import {
    useCreateRule,
    useDeleteRule,
    useMyAvailability,
    useRules,
    useSetBlock,
} from '@/hooks/queries/use-availability';
import { errorKey } from '@/lib/api/errors';
import { currentMonth, monthLabel, monthRange, shiftMonth } from '@/lib/month';
import { todayIso } from '@/lib/occurrence-format';

/**
 * Where a person says when they are not around. Two grids with the same
 * cells: the week schedule on top (every Tuesday evening), the month below
 * (just that Saturday). The week feeds the month, so a rule shows up there
 * at once. Nobody else edits this for them.
 */
export function MyAvailabilityView() {
    const { t, i18n } = useTranslation();
    const [month, setMonth] = useState(currentMonth);
    const { from, to } = monthRange(month);
    const atCurrentMonth =
        month.year === currentMonth().year && month.month === currentMonth().month;
    const availability = useMyAvailability(from, to);
    const rules = useRules();
    const block = useSetBlock();
    const createRule = useCreateRule();
    const deleteRule = useDeleteRule();
    const today = todayIso();
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
    const ruleError = createRule.error ?? deleteRule.error;

    return (
        <>
            <PageHeader titleKey="availability.title" subtitleKey="availability.subtitle" />

            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-base">
                        <Repeat className="size-4 text-muted-foreground" />
                        {t('availability.weeklyTitle')}
                    </h2>
                    <p className="text-xs text-muted-foreground">{t('availability.weeklyHelp')}</p>
                    {ruleError !== null && (
                        <FormMessage tone="error">{t(errorKey(ruleError))}</FormMessage>
                    )}
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
                </section>

                <section className="space-y-3">
                    <h2 className="flex items-center gap-2 text-base">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        {t('availability.monthTitle')}
                    </h2>
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            aria-label={t('availability.previousMonth')}
                            disabled={atCurrentMonth}
                            onClick={() => setMonth(shiftMonth(month, -1))}
                        >
                            <ChevronLeft />
                        </Button>
                        <span className="text-sm font-semibold capitalize">
                            {monthLabel(month, i18n.language)}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            aria-label={t('availability.nextMonth')}
                            onClick={() => setMonth(shiftMonth(month, 1))}
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('availability.gridHelp')}</p>
                    {availability.isError && (
                        <FormMessage tone="error">{t(errorKey(availability.error))}</FormMessage>
                    )}
                    {block.isError && (
                        <FormMessage tone="error">{t(errorKey(block.error))}</FormMessage>
                    )}
                    {availability.data === undefined ? (
                        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
                    ) : (
                        <MonthGrid
                            days={availability.data.days}
                            today={today}
                            pending={availability.isPlaceholderData}
                            onToggle={(date, daypart, busy) =>
                                block.mutate({ date, daypart, busy, from, to })
                            }
                        />
                    )}
                </section>
            </div>
        </>
    );
}
