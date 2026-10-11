/** What a notification shows on the device; the service worker renders it. */
export interface PushMessage {
    title: string;
    body: string;
    /** Where a tap lands, a path on the app. */
    url: string;
    /** Notifications with the same tag replace each other instead of piling up. */
    tag: string;
}

/** The parts of a stored subscription a sender needs. */
export interface PushTarget {
    endpoint: string;
    p256dh: string;
    auth: string;
}

/**
 * The push service said this subscription no longer exists (404 or 410).
 * The caller deletes the row; retrying would only fail the same way.
 */
export class PushGone extends Error {
    constructor(endpoint: string) {
        super(`Push subscription gone: ${endpoint}`);
        this.name = 'PushGone';
    }
}

/**
 * How a push leaves the API. `WebPushSender` talks to the browsers' push
 * services with the VAPID keys; `ConsolePushSender` prints instead, for a
 * machine without keys. Services import `pushSender` from `infrastructure/modules/push`
 * and tests spy on it.
 */
export interface PushSender {
    send(target: PushTarget, message: PushMessage): Promise<void>;
}
