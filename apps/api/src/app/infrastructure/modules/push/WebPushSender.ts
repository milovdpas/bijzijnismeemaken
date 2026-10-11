import webPush, { WebPushError } from 'web-push';

import { PushGone } from './PushSender';
import type { PushMessage, PushSender, PushTarget } from './PushSender';

/** A message nobody saw within a day is stale: the activity page says more than the notification would. */
const TTL_SECONDS = 24 * 60 * 60;
/** A push service that does not answer must not hold up the reminder run. */
const TIMEOUT_MS = 10_000;

/**
 * The real thing: encrypts the message for the browser's keys and posts it
 * to the push service, signed with the VAPID pair so the service knows who
 * is sending. A 404 or 410 means the browser unsubscribed or the person
 * revoked permission; that becomes `PushGone` so the row gets removed.
 */
export default class WebPushSender implements PushSender {
    constructor(subject: string, publicKey: string, privateKey: string) {
        webPush.setVapidDetails(subject, publicKey, privateKey);
    }

    async send(target: PushTarget, message: PushMessage): Promise<void> {
        try {
            await webPush.sendNotification(
                { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
                JSON.stringify(message),
                { TTL: TTL_SECONDS, urgency: 'normal', timeout: TIMEOUT_MS },
            );
        } catch (error) {
            if (
                error instanceof WebPushError &&
                (error.statusCode === 404 || error.statusCode === 410)
            ) {
                throw new PushGone(target.endpoint);
            }
            throw error;
        }
    }
}
