/**
 * Web push, the pure parts. The hook in `hooks/use-push.ts` talks to the
 * browser; this decides what the browser's answers mean.
 */

/** Why push cannot be turned on here, or `ok`. */
export type PushSupport = 'ok' | 'unsupported' | 'needs-install';

/**
 * iOS only delivers push to an installed app, so a Safari tab is told to
 * install first instead of failing on a missing `PushManager`.
 */
export function pushSupport(facts: {
    serviceWorker: boolean;
    pushManager: boolean;
    notification: boolean;
    ios: boolean;
    standalone: boolean;
}): PushSupport {
    if (facts.ios && !facts.standalone) return 'needs-install';
    if (!facts.serviceWorker || !facts.pushManager || !facts.notification) return 'unsupported';
    return 'ok';
}

/** The VAPID public key comes base64url encoded; `pushManager.subscribe` wants bytes. */
export function applicationServerKey(base64Url: string): Uint8Array<ArrayBuffer> {
    const padded = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
    const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let index = 0; index < raw.length; index += 1) {
        bytes[index] = raw.charCodeAt(index);
    }
    return bytes;
}

/** A browser and a device, from a user agent: enough to tell two phones apart in a list. */
export function describeDevice(userAgent: string | null): string {
    if (userAgent === null || userAgent === '') return '';
    const device = /iPhone/i.test(userAgent)
        ? 'iPhone'
        : /iPad/i.test(userAgent)
          ? 'iPad'
          : /Android/i.test(userAgent)
            ? 'Android'
            : /Windows/i.test(userAgent)
              ? 'Windows'
              : /Macintosh/i.test(userAgent)
                ? 'Mac'
                : /Linux/i.test(userAgent)
                  ? 'Linux'
                  : '';
    const browser = /Edg\//i.test(userAgent)
        ? 'Edge'
        : /OPR\//i.test(userAgent)
          ? 'Opera'
          : /Firefox\//i.test(userAgent)
            ? 'Firefox'
            : /Chrome\//i.test(userAgent)
              ? 'Chrome'
              : /Safari\//i.test(userAgent)
                ? 'Safari'
                : '';
    return [browser, device].filter((part) => part !== '').join(' · ');
}
