'use client';

import type { Daypart } from '@bzim/types';
import { CalendarOff, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CellSheet } from '@/components/availability/cell-sheet';
import { GroupGrid } from '@/components/availability/group-grid';
import { FormMessage } from '@/components/common/form-message';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useActivities } from '@/hooks/queries/use-activities';
import { useGroupAvailability, useGroupOccurrences } from '@/hooks/queries/use-availability';
import { errorKey } from '@/lib/api/errors';
import { currentMonth, monthLabel, monthRange, shiftMonth } from '@/lib/month';
import { todayIso } from '@/lib/occurrence-format';

const WHOLE_GROUP = 'all';

/**
 * When is the group free: a month of dayparts with a free count per cell,
 * either for everyone or only for the people in for one activity. What is
 * already planned shows on top. Tapping a cell names names.
 */
export function GroupAvailabilityView({ groupId }: { groupId: string }) {
    const { t, i18n } = useTranslation();
    const [month, setMonth] = useState(currentMonth);
    const [scope, setScope] = useState<string>(WHOLE_GROUP);
    const [cell, setCell] = useState<{ date: string; daypart: Daypart } | null>(null);
    const { from, to } = monthRange(month);
    const activityId = scope === WHOLE_GROUP ? undefined : scope;
    const availability = useGroupAvailability(groupId, from, to, activityId);
    const occurrences = useGroupOccurrences(groupId, from, to);
    const activities = useActivities(groupId, { sort: 'next' });
    const today = todayIso();
    const atCurrentMonth =
        month.year === currentMonth().year && month.month === currentMonth().month;
    const withoutCalendar = availability.data?.users.filter((entry) => !entry.hasCalendar) ?? [];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        aria-label={t('availability.previousMonth')}
                        disabled={atCurrentMonth}
                        onClick={() => setMonth(shiftMonth(month, -1))}
                    >
                        <ChevronLeft />
                    </Button>
                    <span className="min-w-32 text-center text-sm font-semibold capitalize">
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
                <Select value={scope} onValueChange={(value) => setScope(value ?? WHOLE_GROUP)}>
                    <SelectTrigger className="min-w-48" aria-label={t('groupAvailability.scope')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={WHOLE_GROUP}>
                            {t('groupAvailability.wholeGroup')}
                        </SelectItem>
                        {(activities.data ?? []).map((activity) => (
                            <SelectItem key={activity.id} value={activity.id}>
                                {t('groupAvailability.inFor', { title: activity.title })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <p className="text-xs text-muted-foreground">{t('groupAvailability.help')}</p>

            {availability.isError && (
                <FormMessage tone="error">{t(errorKey(availability.error))}</FormMessage>
            )}
            {availability.data === undefined ? (
                <div className="h-96 animate-pulse rounded-2xl bg-muted" />
            ) : (
                <GroupGrid
                    availability={availability.data}
                    occurrences={occurrences.data ?? []}
                    today={today}
                    pending={availability.isPlaceholderData}
                    onSelect={(date, daypart) => setCell({ date, daypart })}
                />
            )}

            {withoutCalendar.length > 0 && (
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CalendarOff className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                        {t('groupAvailability.noCalendarNote', { count: withoutCalendar.length })}{' '}
                        <Link href="/availability" className="underline">
                            {t('groupAvailability.setMine')}
                        </Link>
                    </span>
                </p>
            )}

            {availability.data !== undefined && (
                <CellSheet
                    groupId={groupId}
                    cell={cell}
                    availability={availability.data}
                    occurrences={occurrences.data ?? []}
                    onClose={() => setCell(null)}
                />
            )}
        </div>
    );
}
