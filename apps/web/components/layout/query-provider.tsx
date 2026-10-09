'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError } from '@/lib/api/client';

/**
 * One QueryClient per browser tab, created inside state so a re-render of the
 * provider never throws the cache away.
 *
 * Retries are for flaky networks, not for refusals: a 404 or 403 will not get
 * better by asking again, so only server errors and network failures retry.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        retry: (failureCount, error) =>
                            failureCount < 2 && !(error instanceof ApiError && error.status < 500),
                    },
                },
            }),
    );

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
