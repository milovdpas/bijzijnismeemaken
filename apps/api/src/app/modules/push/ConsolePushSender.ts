import type { PushMessage, PushSender, PushTarget } from './PushSender';

/** Prints the message instead of sending it: a machine without VAPID keys. */
export default class ConsolePushSender implements PushSender {
    send(target: PushTarget, message: PushMessage): Promise<void> {
        console.log(
            `[push] to=${target.endpoint.slice(0, 48)}... title=${JSON.stringify(message.title)} body=${JSON.stringify(message.body)}`,
        );
        return Promise.resolve();
    }
}
