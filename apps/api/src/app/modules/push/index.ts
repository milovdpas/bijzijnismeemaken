import { env } from '../../../config/app';
import ConsolePushSender from './ConsolePushSender';
import type { PushSender } from './PushSender';
import WebPushSender from './WebPushSender';

function createSender(): PushSender {
    const { publicKey, privateKey, subject } = env.push;
    if (publicKey === null || privateKey === null) {
        return new ConsolePushSender();
    }
    return new WebPushSender(subject, publicKey, privateKey);
}

/**
 * The one sender, chosen by whether VAPID keys are set. Services import
 * this; tests `vi.spyOn(pushSender, 'send')` to read what would have gone out.
 */
export const pushSender: PushSender = createSender();

export { PushGone } from './PushSender';
export type { PushMessage, PushSender, PushTarget } from './PushSender';
