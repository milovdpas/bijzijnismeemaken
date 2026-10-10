'use client';

import { GroupAccess } from '@bzim/types';
import { useTranslation } from 'react-i18next';

import { ACCESS_ICONS } from '@/components/groups/access-badge';
import { cn } from '@/lib/utils';

/**
 * The three ways into a group, as stacked radio cards with a line of
 * explanation each. A select would hide the explanations, and the difference
 * between "invite link" and "invite only" is exactly what people get wrong.
 */
export function AccessPicker({
    value,
    onChange,
    className,
}: {
    value: GroupAccess;
    onChange: (access: GroupAccess) => void;
    className?: string;
}) {
    const { t } = useTranslation();

    return (
        <div
            role="radiogroup"
            aria-label={t('access.label')}
            className={cn('grid gap-2', className)}
        >
            {Object.values(GroupAccess).map((access) => {
                const Icon = ACCESS_ICONS[access];
                const selected = value === access;
                return (
                    <button
                        key={access}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(access)}
                        className={cn(
                            'flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                            selected
                                ? 'border-brand bg-brand/15'
                                : 'hover:bg-accent hover:text-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                                selected
                                    ? 'bg-brand text-brand-foreground'
                                    : 'bg-muted text-muted-foreground',
                            )}
                        >
                            <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold">
                                {t(`access.${access}`)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                                {t(`access.${access}Description`)}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
