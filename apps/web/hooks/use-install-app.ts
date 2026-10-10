'use client';

import { useEffect, useState } from 'react';

import { installMethod, isIos, isStandalone } from '@/lib/pwa';
import type { InstallMethod } from '@/lib/pwa';

/** Chrome's deferred install prompt; not in lib.dom, so typed here. */
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Whether and how the app can be installed from here. Chromium browsers
 * hand over a deferred prompt event, which `prompt()` fires; iOS needs the
 * share-sheet steps; everything else points at the browser menu. Once the
 * app runs installed there is nothing to offer.
 */
export function useInstallApp(): {
    installed: boolean;
    method: InstallMethod;
    prompt: () => Promise<boolean>;
} {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    // Read once, lazily: both facts are known before the first render and never change on their own.
    const [installed, setInstalled] = useState(
        () =>
            typeof window !== 'undefined' &&
            isStandalone(
                (query) => window.matchMedia(query).matches,
                (navigator as Navigator & { standalone?: boolean }).standalone,
            ),
    );
    const [ios] = useState(() => typeof navigator !== 'undefined' && isIos(navigator.userAgent));

    useEffect(() => {
        const onPrompt = (event: Event) => {
            event.preventDefault();
            setDeferred(event as BeforeInstallPromptEvent);
        };
        const onInstalled = () => {
            setInstalled(true);
            setDeferred(null);
        };
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    return {
        installed,
        method: installMethod(deferred !== null, ios),
        prompt: async () => {
            if (deferred === null) return false;
            await deferred.prompt();
            const { outcome } = await deferred.userChoice;
            setDeferred(null);
            return outcome === 'accepted';
        },
    };
}
