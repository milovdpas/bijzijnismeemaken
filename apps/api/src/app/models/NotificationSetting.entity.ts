import {
    BaseEntity,
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { NotificationChannel, NotificationType } from '@bzim/types';
import type { NotificationSettingDto } from '@bzim/types';

import User from './User.entity';

/** What a type uses before its owner ever touches it. */
export const NOTIFICATION_DEFAULTS: Readonly<Record<NotificationChannel, boolean>> = {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: false,
};

/**
 * One person's choice for one notification type: which channels may carry
 * it. Only written once changed; the absence of a row is the default.
 */
@Entity('notification_settings')
export default class NotificationSetting extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 24 })
    type!: NotificationType;

    @Column({ type: 'boolean' })
    email!: boolean;

    @Column({ type: 'boolean' })
    push!: boolean;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    allows(channel: NotificationChannel): boolean {
        return channel === NotificationChannel.EMAIL ? this.email : this.push;
    }

    toDto(): NotificationSettingDto {
        return { type: this.type, email: this.email, push: this.push };
    }

    /** The DTO a type has when nobody changed it. */
    static defaultDto(type: NotificationType): NotificationSettingDto {
        return {
            type,
            email: NOTIFICATION_DEFAULTS[NotificationChannel.EMAIL],
            push: NOTIFICATION_DEFAULTS[NotificationChannel.PUSH],
        };
    }
}
