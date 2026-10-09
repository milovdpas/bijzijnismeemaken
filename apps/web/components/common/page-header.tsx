'use client';

import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

/**
 * Title, optional subtitle, optional action on the right.
 *
 * Takes translation keys rather than strings so a server page can render it
 * without becoming a client component itself. The action is a slot because
 * the page knows what it is (a "new group" button, a filter) and this does
 * not.
 */
export function PageHeader({
    titleKey,
    subtitleKey,
    action,
    className,
}: {
    titleKey: string;
    subtitleKey?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    const { t } = useTranslation();

    return (
        <header className={cn('mb-6 flex items-start justify-between gap-4', className)}>
            <div>
                <h1 className="text-2xl md:text-3xl">{t(titleKey)}</h1>
                {subtitleKey !== undefined && (
                    <p className="mt-1 text-sm text-muted-foreground">{t(subtitleKey)}</p>
                )}
            </div>
            {action !== undefined && <div className="shrink-0">{action}</div>}
        </header>
    );
}
