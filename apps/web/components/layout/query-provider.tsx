'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/client';
import { errorKey, toastWorthy } from '@/lib/api/errors';
import i18n from '@/lib/i18n';

declare module '@tanstack/react-query' {
    interface Register {
        /** `meta: { silent: true }` on a mutation that shows its own failure. */
        mutationMeta: { silent?: boolean };
    }
}

/**
 * One QueryClient per browser tab, created inside state so a re-render of the
 * provider never throws the cache away.
 *
 * Data is kept for half an hour after its screen closes, so coming back to a
 * tab shows what was there at once and replaces it when the fresh answer
 * arrives (after `staleTime`, it is refetched in the background).
 *
 * Retries are for flaky networks, not for refusals: a 404 or 403 will not get
 * better by asking again, so only server errors and network failures retry.
 *
 * A mutation that fails for a reason no form explains (the network, a 403,
 * a 500) is announced once, here, as a toast in the person's language. The
 * forms keep their inline messages for the codes they know.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(
        () =>
            new QueryClient({
                mutationCache: new MutationCache({
                    onError: (error, _variables, _context, mutation) => {
                        if (mutation.meta?.silent === true || !toastWorthy(error)) return;
                        toast.error(i18n.t(errorKey(error)));
                    },
                }),
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        gcTime: 30 * 60_000,
                        retry: (failureCount, error) =>
                            failureCount < 2 && !(error instanceof ApiError && error.status < 500),
                    },
                },
            }),
    );

    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
