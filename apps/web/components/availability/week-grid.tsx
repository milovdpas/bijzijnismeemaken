'use client';

import { Info } from 'luxon';
import { DAYPART_ORDER } from '@bzim/types';
import type { Daypart, UnavailabilityRuleDto, Weekday } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { DaypartGrid } from '@/components/availability/daypart-grid';
import type { GridRow } from '@/components/availability/daypart-grid';

const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * The week schedule: Monday to Sunday as rows, a tap per cell. A busy cell
 * is a weekly rule; tapping it off removes every rule for that weekday and
 * daypart, including any with a season, so what you see is what applies.
 */
export function WeekGrid({
    rules,
    todayWeekday,
    pending,
    onToggle,
    className,
}: {
    rules: UnavailabilityRuleDto[];
    todayWeekday: Weekday;
    pending: boolean;
    onToggle: (weekday: Weekday, daypart: Daypart, busy: boolean) => void;
    className?: string;
}) {
    const { i18n } = useTranslation();
    const names = Info.weekdays('short', { locale: i18n.language });

    const rows: GridRow[] = WEEKDAYS.map((weekday) => ({
        key: String(weekday),
        label: names[weekday - 1] ?? String(weekday),
        highlight: weekday === todayWeekday,
        shaded: weekday >= 6,
        cells: Object.fromEntries(
            DAYPART_ORDER.map((daypart) => [
                daypart,
                rules.some((rule) => rule.weekday === weekday && rule.daypart === daypart)
                    ? 'rule'
                    : 'free',
            ]),
        ) as GridRow['cells'],
    }));

    return (
        <DaypartGrid
            rows={rows}
            rulesEditable
            pending={pending}
            onToggle={(key, daypart, state) =>
                onToggle(Number(key) as Weekday, daypart, state === 'free')
            }
            className={className}
        />
    );
}
