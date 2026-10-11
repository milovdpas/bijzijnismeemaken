import { z } from 'zod';

/**
 * The browsers' push services. The API posts to whatever endpoint it stores,
 * from the server, so an endpoint is only ever one of these: anything else
 * would be a way to make the VPS call an address of the caller's choosing.
 */
const PUSH_HOSTS = [
    /^fcm\.googleapis\.com$/,
    /(^|\.)push\.apple\.com$/,
    /^updates\.push\.services\.mozilla\.com$/,
    /(^|\.)notify\.windows\.com$/,
];

export function isPushServiceUrl(value: string): boolean {
    try {
        const { hostname } = new URL(value);
        return PUSH_HOSTS.some((host) => host.test(hostname));
    } catch {
        return false;
    }
}

/** What `PushSubscription.toJSON()` gives the browser; the keys are base64url strings. */
export const createPushSubscriptionSchema = z.object({
    endpoint: z
        .url({ protocol: /^https$/ })
        .max(500)
        .refine(isPushServiceUrl, 'Not a known push service'),
    keys: z.object({
        p256dh: z.string().min(1).max(255),
        auth: z.string().min(1).max(255),
    }),
});

export const pushSubscriptionParamSchema = z.object({
    subscriptionId: z.uuid(),
});
