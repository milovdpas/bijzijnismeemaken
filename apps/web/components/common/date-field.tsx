'use client';

import type { IsoDateString } from '@bzim/types';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    calendarWeeks,
    formatDateInput,
    longDateLabel,
    maskDateInput,
    openingMonth,
    outsideRange,
    parseDateInput,
    weekdayLabels,
} from '@/lib/date-input';
import { monthLabel, shiftMonth } from '@/lib/month';
import type { Month } from '@/lib/month';
import { todayIso } from '@/lib/occurrence-format';
import { cn } from '@/lib/utils';

/**
 * A date as dd/mm/yyyy on every device, where the browser's own field
 * follows the device's language. Typed (the slashes come by themselves,
 * so a phone's number pad is enough) or picked from a month calendar,
 * Monday first. `value` is the ISO day or ''; half-typed text counts as no
 * date until it is a whole one. `min` and `max` grey out days in the
 * calendar; a typed day outside them is left to the form to judge.
 */
export function DateField({
    value,
    onChange,
    min,
    max,
    id,
    autoFocus,
    className,
    'aria-describedby': describedBy,
}: {
    value: IsoDateString | '';
    onChange: (value: IsoDateString | '') => void;
    min?: IsoDateString;
    max?: IsoDateString;
    id?: string;
    autoFocus?: boolean;
    className?: string;
    'aria-describedby'?: string;
}) {
    const { t, i18n } = useTranslation();
    const [text, setText] = useState(formatDateInput(value));
    const [shown, setShown] = useState(value);
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState<Month>(() => openingMonth(value, min, todayIso()));
    const today = todayIso();

    // Set from outside, by a suggestion or a reset: show that instead of the text.
    if (value !== shown) {
        setShown(value);
        setText(formatDateInput(value));
    }

    const commit = (next: IsoDateString | '') => {
        setShown(next);
        onChange(next);
    };
    const pick = (date: IsoDateString) => {
        setText(formatDateInput(date));
        commit(date);
        setOpen(false);
    };

    return (
        <div className={cn('relative', className)}>
            <Input
                id={id}
                autoFocus={autoFocus}
                aria-describedby={describedBy}
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('dateField.placeholder')}
                maxLength={10}
                value={text}
                className="pr-9 tabular-nums"
                onChange={(event) => {
                    const masked = maskDateInput(event.target.value);
                    setText(masked);
                    commit(parseDateInput(masked) ?? '');
                }}
            />
            <Popover
                open={open}
                onOpenChange={(next) => {
                    if (next) setMonth(openingMonth(value, min, today));
                    setOpen(next);
                }}
            >
                <PopoverTrigger
                    render={
                        <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            className="absolute top-1/2 right-1 -translate-y-1/2"
                            aria-label={t('dateField.open')}
                        />
                    }
                >
                    <CalendarDays />
                </PopoverTrigger>
                {/* On a short screen (a phone on its side) the month scrolls rather than being cut off. */}
                <PopoverContent align="end" className="max-h-(--available-height) overflow-y-auto">
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t('dateField.previous')}
                            onClick={() => setMonth(shiftMonth(month, -1))}
                        >
                            <ChevronLeft />
                        </Button>
                        <span
                            className="text-sm font-bold first-letter:uppercase"
                            aria-live="polite"
                        >
                            {monthLabel(month, i18n.language)}
                        </span>
                        <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={t('dateField.next')}
                            onClick={() => setMonth(shiftMonth(month, 1))}
                        >
                            <ChevronRight />
                        </Button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                        {weekdayLabels(i18n.language).map((label) => (
                            <span
                                key={label}
                                className="py-1 text-[0.7rem] font-semibold text-muted-foreground"
                            >
                                {label}
                            </span>
                        ))}
                        {calendarWeeks(month)
                            .flat()
                            .map((day) => (
                                <button
                                    key={day.date}
                                    type="button"
                                    disabled={outsideRange(day.date, min, max)}
                                    aria-pressed={day.date === value}
                                    aria-label={longDateLabel(day.date, i18n.language)}
                                    onClick={() => pick(day.date)}
                                    className={cn(
                                        'h-9 rounded-lg text-sm tabular-nums transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-30',
                                        !day.inMonth && 'text-muted-foreground',
                                        day.date === today &&
                                            'font-extrabold underline underline-offset-4',
                                        day.date === value &&
                                            'bg-brand font-bold text-brand-foreground hover:bg-brand',
                                    )}
                                >
                                    {day.day}
                                </button>
                            ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
