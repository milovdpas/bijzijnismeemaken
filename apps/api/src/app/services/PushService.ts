import { In } from 'typeorm';
import { DateTime } from 'luxon';

import { env } from '../../config/app';
import PushSubscription from '../models/PushSubscription.entity';
import type User from '../models/User.entity';
import { PushGone, pushSender } from '../modules/push';
import { shortEndpoint } from '../utils/Log';
import type { PushMessage } from '../modules/push';

export interface PushSubscriptionInput {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}

/**
 * The browsers that asked for push, and the sending itself. Settings decide
 * who wants what (`NotificationSettingService`); this only knows devices.
 */
export class PushService {
    /** The key the browser subscribes with; null means this server cannot push at all. */
    static publicKey(): string | null {
        return env.push.publicKey;
    }

    static list(user: User): Promise<PushSubscription[]> {
        return PushSubscription.find({
            where: { userId: user.id },
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * Upsert by endpoint. A browser re-subscribing sends the same endpoint
     * with fresh keys; a different person signing in on the same browser
     * takes the row over, since the device now shows their notifications.
     */
    static async subscribe(
        user: User,
        input: PushSubscriptionInput,
        userAgent: string | null,
    ): Promise<PushSubscription> {
        const row =
            (await PushSubscription.findOneBy({ endpoint: input.endpoint })) ??
            PushSubscription.create({ endpoint: input.endpoint });
        row.userId = user.id;
        row.p256dh = input.keys.p256dh;
        row.auth = input.keys.auth;
        row.userAgent = userAgent;
        return row.save();
    }

    /** Only one's own; a stranger's id answers as if it did not exist. */
    static async unsubscribe(user: User, subscriptionId: string): Promise<boolean> {
        const result = await PushSubscription.delete({ id: subscriptionId, userId: user.id });
        return (result.affected ?? 0) > 0;
    }

    /**
     * Every device of every recipient, sent together. One that fails never
     * holds up another; one the push service reports gone is forgotten. The
     * message is rendered per person, since the language is theirs.
     */
    static async send(recipients: User[], render: (user: User) => PushMessage): Promise<void> {
        if (recipients.length === 0) return;
        const rows = await PushSubscription.findBy({
            userId: In(recipients.map((user) => user.id)),
        });
        if (rows.length === 0) return;
        const byUser = new Map(recipients.map((user) => [user.id, user]));
        const messages = new Map<string, PushMessage>();
        await Promise.all(
            rows.map(async (row) => {
                const user = byUser.get(row.userId);
                if (user === undefined) return;
                const message = messages.get(user.id) ?? render(user);
                messages.set(user.id, message);
                try {
                    await pushSender.send(row, message);
                    await PushSubscription.update(row.id, {
                        lastUsedAt: DateTime.utc().toJSDate(),
                    });
                } catch (error) {
                    if (error instanceof PushGone) {
                        await PushSubscription.delete(row.id);
                        return;
                    }
                    console.error(
                        `Could not push "${message.title}" to ${shortEndpoint(row.endpoint)}:`,
                        error,
                    );
                }
            }),
        );
    }
}
