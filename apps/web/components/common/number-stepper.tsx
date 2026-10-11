'use client';

import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A small whole number between bounds, changed one step at a time. Easier
 * than a number input on a phone, and it cannot leave the bounds the API
 * enforces. `label` names the value for screen readers.
 */
export function NumberStepper({
    value,
    min,
    max,
    label,
    disabled = false,
    onChange,
    className,
}: {
    value: number;
    min: number;
    max: number;
    label: string;
    disabled?: boolean;
    onChange: (value: number) => void;
    className?: string;
}) {
    const { t } = useTranslation();
    return (
        <div className={cn('inline-flex items-center gap-2', className)}>
            <Button
                type="button"
                size="icon-sm"
                variant="outline"
                disabled={disabled || value <= min}
                aria-label={t('common.oneLess', { label })}
                onClick={() => onChange(Math.max(min, value - 1))}
            >
                <Minus />
            </Button>
            <span className="w-8 text-center text-base font-bold tabular-nums" aria-live="polite">
                {value}
            </span>
            <Button
                type="button"
                size="icon-sm"
                variant="outline"
                disabled={disabled || value >= max}
                aria-label={t('common.oneMore', { label })}
                onClick={() => onChange(Math.min(max, value + 1))}
            >
                <Plus />
            </Button>
        </div>
    );
}
