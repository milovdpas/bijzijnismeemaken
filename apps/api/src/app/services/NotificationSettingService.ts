import { In } from 'typeorm';
import { NotificationChannel, NotificationType } from '@bzim/types';
import type { NotificationSettingDto } from '@bzim/types';

import NotificationSetting, { NOTIFICATION_DEFAULTS } from '../models/NotificationSetting.entity';
import type User from '../models/User.entity';

/**
 * Who wants what through which channel. The settings screen reads and writes
 * here; `NotificationService` asks here before sending anything.
 */
export class NotificationSettingService {
    /** Every type, in enum order, with the default standing in for untouched ones. */
    static async list(user: User): Promise<NotificationSettingDto[]> {
        const rows = await NotificationSetting.findBy({ userId: user.id });
        return Object.values(NotificationType).map(
            (type) =>
                rows.find((row) => row.type === type)?.toDto() ??
                NotificationSetting.defaultDto(type),
        );
    }

    /** Upsert: the first change creates the row, later ones overwrite it. */
    static async update(
        user: User,
        type: NotificationType,
        channels: { email: boolean; push: boolean },
    ): Promise<NotificationSettingDto> {
        const row =
            (await NotificationSetting.findOneBy({ userId: user.id, type })) ??
            NotificationSetting.create({ userId: user.id, type });
        row.email = channels.email;
        row.push = channels.push;
        await row.save();
        return row.toDto();
    }

    /** Of these people, the ones who take `type` on `channel`. Order kept. */
    static async subscribers(
        users: User[],
        type: NotificationType,
        channel: NotificationChannel,
    ): Promise<User[]> {
        return (await NotificationSettingService.split(users, type))[channel];
    }

    /** The same, for every channel at once: one query, each list in the given order. */
    static async split(
        users: User[],
        type: NotificationType,
    ): Promise<Record<NotificationChannel, User[]>> {
        const empty = { [NotificationChannel.EMAIL]: [], [NotificationChannel.PUSH]: [] };
        if (users.length === 0) {
            return empty;
        }
        const rows = await NotificationSetting.findBy({
            userId: In(users.map((user) => user.id)),
            type,
        });
        const byUser = new Map(rows.map((row) => [row.userId, row]));
        const takes = (user: User, channel: NotificationChannel) =>
            byUser.get(user.id)?.allows(channel) ?? NOTIFICATION_DEFAULTS[channel];
        return {
            [NotificationChannel.EMAIL]: users.filter((user) =>
                takes(user, NotificationChannel.EMAIL),
            ),
            [NotificationChannel.PUSH]: users.filter((user) =>
                takes(user, NotificationChannel.PUSH),
            ),
        };
    }
}
