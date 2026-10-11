import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import type { PushSubscriptionDto } from '@bzim/types';

import User from './User.entity';

/**
 * One browser that asked for push notifications: the push service's endpoint
 * and the two keys that encrypt a message for it. A device, not a person:
 * whoever signs in on it last owns the row.
 */
@Entity('push_subscriptions')
export default class PushSubscription extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 500 })
    endpoint!: string;

    @Column({ type: 'varchar', length: 255 })
    p256dh!: string;

    @Column({ type: 'varchar', length: 255 })
    auth!: string;

    @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
    userAgent!: string | null;

    @Column({ name: 'last_used_at', type: 'datetime', precision: 3, nullable: true })
    lastUsedAt!: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** The keys stay on the server; the browser only needs to recognise its own endpoint. */
    toDto(): PushSubscriptionDto {
        return {
            id: this.id,
            endpoint: this.endpoint,
            userAgent: this.userAgent,
            createdAt: this.createdAt.toISOString(),
            lastUsedAt: this.lastUsedAt?.toISOString() ?? null,
        };
    }
}
