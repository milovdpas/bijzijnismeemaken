'use client';

import { useEffect, useState } from 'react';

import {
    useCreatePushSubscription,
    useDeletePushSubscription,
} from '@/hooks/queries/use-notifications';
import { applicationServerKey, pushSupport } from '@/lib/push';
import type { PushSupport } from '@/lib/push';
import { isIos, isStandalone } from '@/lib/pwa';

/** What the browser says about push on this device, and the two things one can do about it. */
export interface PushDevice {
    support: PushSupport;
    permission: NotificationPermission;
    /** This browser's own subscription endpoint, once known; null when it has none. */
    endpoint: string | null;
    busy: boolean;
    /** An i18n key, after something went wrong. */
    error: string | null;
    enable: (publicKey: string) => Promise<void>;
    disable: (subscriptionId: string | undefined) => Promise<void>;
}

/**
 * The browser side of web push: permission, the service worker's
 * subscription, and registering it with the API. The service worker is
 * registered here on demand too, so a browser that never got one (a dev
 * build) can still subscribe.
 */
export function usePush(): PushDevice {
    const [support, setSupport] = useState<PushSupport>('unsupported');
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [endpoint, setEndpoint] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const create = useCreatePushSubscription();
    const remove = useDeletePushSubscription();

    useEffect(() => {
        const detect = async () => {
            const facts = {
                serviceWorker: 'serviceWorker' in navigator,
                pushManager: 'PushManager' in window,
                notification: 'Notification' in window,
                ios: isIos(navigator.userAgent),
                standalone: isStandalone(
                    (query) => window.matchMedia(query).matches,
                    (navigator as Navigator & { standalone?: boolean }).standalone,
                ),
            };
            const supported = pushSupport(facts);
            setSupport(supported);
            if (supported !== 'ok') return;
            setPermission(Notification.permission);
            const registration = await navigator.serviceWorker.getRegistration();
            const current = await registration?.pushManager.getSubscription();
            setEndpoint(current?.endpoint ?? null);
        };
        void detect().catch(() => setSupport('unsupported'));
    }, []);

    const enable = async (publicKey: string) => {
        setBusy(true);
        setError(null);
        try {
            const granted = await Notification.requestPermission();
            setPermission(granted);
            if (granted !== 'granted') return;
            const registration =
                (await navigator.serviceWorker.getRegistration()) ??
                (await navigator.serviceWorker.register('/sw.js'));
            await navigator.serviceWorker.ready;
            const subscription =
                (await registration.pushManager.getSubscription()) ??
                (await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: applicationServerKey(publicKey),
                }));
            const json = subscription.toJSON();
            if (json.endpoint === undefined || json.keys === undefined) {
                throw new Error('Subscription without keys');
            }
            await create.mutateAsync({
                endpoint: json.endpoint,
                keys: { p256dh: json.keys.p256dh ?? '', auth: json.keys.auth ?? '' },
            });
            setEndpoint(subscription.endpoint);
        } catch (caught) {
            console.warn('Push subscribe failed', caught);
            setError('notifications.failed');
        } finally {
            setBusy(false);
        }
    };

    const disable = async (subscriptionId: string | undefined) => {
        setBusy(true);
        setError(null);
        try {
            if (subscriptionId !== undefined) await remove.mutateAsync(subscriptionId);
            const registration = await navigator.serviceWorker.getRegistration();
            const subscription = await registration?.pushManager.getSubscription();
            await subscription?.unsubscribe();
            setEndpoint(null);
        } catch (caught) {
            console.warn('Push unsubscribe failed', caught);
            setError('notifications.failed');
        } finally {
            setBusy(false);
        }
    };

    return { support, permission, endpoint, busy, error, enable, disable };
}
