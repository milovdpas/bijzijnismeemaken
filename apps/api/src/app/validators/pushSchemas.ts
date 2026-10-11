import { z } from 'zod';

/** What `PushSubscription.toJSON()` gives the browser; the keys are base64url strings. */
export const createPushSubscriptionSchema = z.object({
    endpoint: z.url().max(500),
    keys: z.object({
        p256dh: z.string().min(1).max(255),
        auth: z.string().min(1).max(255),
    }),
});

export const pushSubscriptionParamSchema = z.object({
    subscriptionId: z.uuid(),
});
