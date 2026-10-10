'use client';

import { I18nProvider } from '@/components/layout/i18n-provider';
import { InstallPrompt } from '@/components/layout/install-prompt';
import { QueryProvider } from '@/components/layout/query-provider';

/**
 * The providers the signed-in app needs, mounted once by `app/(app)/layout.tsx`.
 *
 * Kept out of the root layout so the login page does not load i18n, the query
 * cache or the auth gate. The one-time install prompt lives here too, so it
 * shows on every signed-in page and nowhere else.
 */
export function AppRuntime({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <I18nProvider>
                {children}
                <InstallPrompt />
            </I18nProvider>
        </QueryProvider>
    );
}
