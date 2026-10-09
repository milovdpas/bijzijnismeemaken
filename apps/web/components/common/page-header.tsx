'use client';

import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/**
 * Takes translation keys rather than strings so a server page can render it
 * without becoming a client component itself.
 */
export function PageHeader({
    titleKey,
    subtitleKey,
    className,
}: {
    titleKey: string;
    subtitleKey?: string;
    className?: string;
}) {
    const { t } = useTranslation();

    return (
        <header className={cn('mb-6', className)}>
            <h1 className="text-2xl font-semibold tracking-tight">{t(titleKey)}</h1>
            {subtitleKey !== undefined && (
                <p className="mt-1 text-sm text-muted-foreground">{t(subtitleKey)}</p>
            )}
        </header>
    );
}
