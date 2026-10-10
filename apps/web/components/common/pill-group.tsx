'use client';

import { cn } from '@/lib/utils';

/**
 * A row of pills that acts as one radio group; the chosen one is yellow.
 * Used for filters and for the short either-or choices on forms, so they
 * all look the same.
 */
export function PillGroup<T extends string>({
    options,
    value,
    labelFor,
    onChange,
    ariaLabel,
    disabled,
    className,
}: {
    options: readonly T[];
    value: T;
    labelFor: (option: T) => string;
    onChange: (option: T) => void;
    ariaLabel?: string;
    disabled?: (option: T) => boolean;
    className?: string;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className={cn('flex flex-wrap gap-1.5', className)}
        >
            {options.map((option) => (
                <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={value === option}
                    disabled={disabled?.(option) ?? false}
                    onClick={() => onChange(option)}
                    className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-40',
                        value === option
                            ? 'bg-brand text-brand-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                >
                    {labelFor(option)}
                </button>
            ))}
        </div>
    );
}
