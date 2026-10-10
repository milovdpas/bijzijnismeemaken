'use client';

import { DAYPART_ORDER } from '@bzim/types';
import type { Daypart, MyAvailabilityDay } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { DaypartGrid } from '@/components/availability/daypart-grid';
import type { GridRow } from '@/components/availability/daypart-grid';
import { dayLabel, isWeekend } from '@/lib/month';

/**
 * A month as rows of the daypart grid. Rule cells are marks here, not
 * buttons: the week schedule is where rules change. Past days are left out;
 * blocking them serves nobody.
 */
export function MonthGrid({
    days,
    today,
    pending,
    onToggle,
    className,
}: {
    days: MyAvailabilityDay[];
    today: string;
    pending: boolean;
    onToggle: (date: string, daypart: Daypart, busy: boolean) => void;
    className?: string;
}) {
    const { i18n } = useTranslation();

    // Yesterday is nobody's business here: the grid starts today.
    const rows: GridRow[] = days
        .filter((day) => day.date >= today)
        .map((day) => ({
            key: day.date,
            label: dayLabel(day.date, i18n.language),
            highlight: day.date === today,
            shaded: isWeekend(day.date),
            cells: Object.fromEntries(
                DAYPART_ORDER.map((daypart) => [daypart, day.dayparts[daypart] ?? 'free']),
            ) as GridRow['cells'],
        }));

    return (
        <DaypartGrid
            rows={rows}
            rulesEditable={false}
            pending={pending}
            onToggle={onToggle}
            className={className}
        />
    );
}
