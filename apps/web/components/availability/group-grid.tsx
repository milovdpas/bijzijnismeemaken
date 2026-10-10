'use client';

import { DAYPART_ORDER } from '@bzim/types';
import type { Daypart, GroupAvailabilityResponse, GroupOccurrenceDto } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { CATEGORY_ICONS } from '@/lib/activity-categories';
import { cellTone, freeIds, occurrencesInCell } from '@/lib/group-availability';
import type { CellTone } from '@/lib/group-availability';
import { dayLabel, isWeekend } from '@/lib/month';
import { cn } from '@/lib/utils';

const TONE: Record<CellTone, string> = {
    all: 'bg-free/40 hover:bg-free/60',
    some: 'bg-brand/35 hover:bg-brand/55',
    none: 'bg-busy/35 hover:bg-busy/50',
    empty: 'bg-muted',
};

/**
 * The group's days down, the dayparts across, a count per cell: how many of
 * the people shown are free. Green when everyone is, red when nobody is,
 * yellow in between. A cell with something already planned shows the
 * activity's icon; tapping a cell opens who is free and who is not.
 */
export function GroupGrid({
    availability,
    occurrences,
    today,
    pending,
    onSelect,
    className,
}: {
    availability: GroupAvailabilityResponse;
    occurrences: GroupOccurrenceDto[];
    today: string;
    pending: boolean;
    onSelect: (date: string, daypart: Daypart) => void;
    className?: string;
}) {
    const { t, i18n } = useTranslation();
    const userIds = availability.users.map(({ user }) => user.id);
    const days = availability.days.filter((day) => day.date >= today);

    return (
        <div className={cn('rounded-2xl border bg-card', className)}>
            <div className="sticky top-(--h-topbar) z-(--z-sticky) grid grid-cols-[4.5rem_repeat(3,1fr)] gap-1 rounded-t-2xl border-b bg-card px-2 py-2 text-[11px] font-semibold text-muted-foreground">
                <span />
                {DAYPART_ORDER.map((daypart) => (
                    <span key={daypart} className="text-center">
                        {t(`daypartsShort.${daypart}`)}
                    </span>
                ))}
            </div>
            <div className={cn('divide-y', pending && 'opacity-70')}>
                {days.map((day) => (
                    <div
                        key={day.date}
                        className={cn(
                            'grid grid-cols-[4.5rem_repeat(3,1fr)] items-center gap-1 px-2 py-1',
                            isWeekend(day.date) && 'bg-muted/30',
                            day.date === today && 'bg-brand/10',
                        )}
                    >
                        <span
                            className={cn(
                                'text-xs font-semibold tabular-nums',
                                day.date === today ? 'text-ink' : 'text-muted-foreground',
                            )}
                        >
                            {dayLabel(day.date, i18n.language)}
                        </span>
                        {DAYPART_ORDER.map((daypart) => {
                            const free = freeIds(day, daypart, userIds).length;
                            const planned = occurrencesInCell(occurrences, day.date, daypart);
                            const Icon =
                                planned[0] === undefined
                                    ? null
                                    : CATEGORY_ICONS[planned[0].activity.category];
                            return (
                                <button
                                    key={daypart}
                                    type="button"
                                    onClick={() => onSelect(day.date, daypart)}
                                    aria-label={`${dayLabel(day.date, i18n.language)} ${t(`dayparts.${daypart}`)}: ${t('groupAvailability.freeOf', { free, total: userIds.length })}`}
                                    title={
                                        planned.map((o) => o.activity.title).join(', ') || undefined
                                    }
                                    className={cn(
                                        'flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold tabular-nums transition-colors',
                                        TONE[cellTone(free, userIds.length)],
                                    )}
                                >
                                    {Icon !== null && <Icon className="size-3.5" />}
                                    {userIds.length === 0
                                        ? '–'
                                        : `${String(free)}/${String(userIds.length)}`}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
