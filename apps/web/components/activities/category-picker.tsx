'use client';

import type { ActivityCategory } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { CATEGORY_ICONS, CATEGORY_ORDER } from '@/lib/activity-categories';
import { cn } from '@/lib/utils';

/** Seven kinds of activity as icon pills; one is always chosen. */
export function CategoryPicker({
    value,
    onChange,
    className,
}: {
    value: ActivityCategory;
    onChange: (category: ActivityCategory) => void;
    className?: string;
}) {
    const { t } = useTranslation();

    return (
        <div
            role="radiogroup"
            aria-label={t('activityForm.category')}
            className={cn('flex flex-wrap gap-2', className)}
        >
            {CATEGORY_ORDER.map((category) => {
                const Icon = CATEGORY_ICONS[category];
                const selected = value === category;
                return (
                    <button
                        key={category}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(category)}
                        className={cn(
                            'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                            selected
                                ? 'border-brand bg-brand text-brand-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                    >
                        <Icon className="size-4" />
                        {t(`categories.${category}`)}
                    </button>
                );
            })}
        </div>
    );
}
