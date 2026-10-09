'use client';

import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/**
 * What a list shows before it has anything in it.
 *
 * The icon sits on a yellow tile so an empty screen still has one spot of the
 * brand on it, and the action (when there is one) is the obvious next thing to
 * press. Centred and generous, because an empty list is usually the first
 * thing a new member sees.
 */
export function EmptyState({
    icon: Icon,
    titleKey,
    descriptionKey,
    action,
    className,
}: {
    icon: LucideIcon;
    titleKey: string;
    descriptionKey?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    const { t } = useTranslation();

    return (
        <div
            className={cn(
                'flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center',
                className,
            )}
        >
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
                <Icon className="size-7" />
            </span>
            <h2 className="text-lg">{t(titleKey)}</h2>
            {descriptionKey !== undefined && (
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t(descriptionKey)}</p>
            )}
            {action !== undefined && <div className="mt-5">{action}</div>}
        </div>
    );
}
