'use client';

import { I18nProvider } from '@/components/layout/i18n-provider';
import { QueryProvider } from '@/components/layout/query-provider';

/**
 * The providers the signed-in app needs, mounted once by `app/(app)/layout.tsx`.
 *
 * Kept out of the root layout so the login page does not load i18n, the query
 * cache or (later) the auth gate. Side-effect initialisers that render nothing
 * (service worker, install prompt) also belong here when they arrive.
 */
export function AppRuntime({ children }: { children: React.ReactNode }) {
    return (
        <QueryProvider>
            <I18nProvider>{children}</I18nProvider>
        </QueryProvider>
    );
}
