import type { Metadata } from 'next';

import { AppLogo } from '@/components/layout/app-logo';

export const metadata: Metadata = { title: 'Offline' };

/**
 * What the service worker shows for a navigation while there is no network.
 * Static and in both languages at once, since nothing can be fetched to
 * decide which one the person wanted.
 */
export default function OfflinePage() {
    return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
            <AppLogo size="lg" />
            <h1 className="text-2xl">Even geen verbinding</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
                De app heeft internet nodig om je groepen te laten zien. Probeer het zo nog eens.
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
                No connection right now. The app needs the internet to show your groups; try again
                in a moment.
            </p>
        </main>
    );
}
