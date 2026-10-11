'use client';

import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useOnline } from '@/hooks/use-online';

/**
 * A strip under the top bar while there is no network. Queries pause and
 * mutations wait (TanStack's online mode), so the person should know why
 * nothing moves rather than tapping twice.
 */
export function OfflineBanner() {
    const { t } = useTranslation();
    const online = useOnline();

    if (online) return null;

    return (
        <div
            role="status"
            className="fixed inset-x-0 top-(--h-topbar) z-(--z-sticky) flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-sm text-background"
        >
            <WifiOff className="size-4 shrink-0" />
            {t('offline.banner')}
        </div>
    );
}
