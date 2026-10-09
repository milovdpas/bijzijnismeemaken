'use client';

import { usePreferencesStore } from '@/store/use-preferences-store';

/**
 * Renders a skeleton until the persisted preferences store has rehydrated.
 *
 * Anything that reads the store during the first client render would otherwise
 * see the defaults, paint them, and flip a frame later. Wrapping the view in
 * this gate trades that flicker for one skeleton frame.
 */
export function HydrationGate({ children }: { children: React.ReactNode }) {
    const hydrated = usePreferencesStore((s) => s.hydrated);

    if (!hydrated) {
        return (
            <div className="space-y-4 py-2">
                <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
                <div className="h-24 animate-pulse rounded-xl bg-muted" />
                <div className="h-48 animate-pulse rounded-xl bg-muted" />
            </div>
        );
    }
    return <>{children}</>;
}
