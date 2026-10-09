import { DateTime } from 'luxon';
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import User from './User.entity';

export enum EmailTokenPurpose {
    VERIFY_EMAIL = 'verify_email',
    RESET_PASSWORD = 'reset_password',
}

/**
 * A one-time link sent by email.
 *
 * The link carries the random value; the row holds only its hash, so reading
 * the database does not yield a working link. A token is spent by setting
 * `usedAt`, never deleted, so a second click can be answered with "already
 * used" rather than "unknown".
 */
@Entity('email_tokens')
export default class EmailToken extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 16 })
    purpose!: EmailTokenPurpose;

    @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
    tokenHash!: string;

    @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
    expiresAt!: Date;

    @Column({ name: 'used_at', type: 'datetime', precision: 3, nullable: true })
    usedAt!: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    isUsable(now: DateTime): boolean {
        return this.usedAt === null && DateTime.fromJSDate(this.expiresAt) > now;
    }
}
