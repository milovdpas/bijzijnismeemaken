'use client';

import { DAYPART_ORDER } from '@bzim/types';
import type { Daypart } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/** The three dayparts as toggles; any number may be on. */
export function DaypartPicker({
    value,
    onChange,
    className,
}: {
    value: Daypart[];
    onChange: (dayparts: Daypart[]) => void;
    className?: string;
}) {
    const { t } = useTranslation();

    const toggle = (daypart: Daypart) =>
        onChange(
            value.includes(daypart)
                ? value.filter((item) => item !== daypart)
                : DAYPART_ORDER.filter((item) => item === daypart || value.includes(item)),
        );

    return (
        <div
            role="group"
            aria-label={t('activityForm.preferredDayparts')}
            className={cn('flex flex-wrap gap-2', className)}
        >
            {DAYPART_ORDER.map((daypart) => {
                const on = value.includes(daypart);
                return (
                    <button
                        key={daypart}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(daypart)}
                        className={cn(
                            'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                            on
                                ? 'border-brand bg-brand text-brand-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                    >
                        {t(`dayparts.${daypart}`)}
                    </button>
                );
            })}
        </div>
    );
}
