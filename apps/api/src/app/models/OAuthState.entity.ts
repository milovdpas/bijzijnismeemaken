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

/** Why an OAuth round trip was started, so the callback knows what to do with the code. */
export enum OAuthPurpose {
    LOGIN = 'login',
    CALENDAR_READ = 'calendar_read',
    CALENDAR_WRITE = 'calendar_write',
}

/**
 * One in-flight OAuth round trip.
 *
 * The `state` value travels to Google and back; the row says what the trip
 * was for, who started it (null for a login, because nobody is signed in yet)
 * and where to send the browser afterwards. Rows are deleted when consumed and
 * swept by the cleanup job when abandoned.
 */
@Entity('oauth_states')
export default class OAuthState extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 64, unique: true })
    state!: string;

    @Column({ type: 'varchar', length: 16 })
    purpose!: OAuthPurpose;

    @Column({ name: 'user_id', type: 'char', length: 36, nullable: true })
    userId!: string | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user!: User | null;

    /** A relative path inside the web app, validated before it is stored. */
    @Column({ name: 'return_to', type: 'varchar', length: 255, nullable: true })
    returnTo!: string | null;

    @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
    expiresAt!: Date;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    isExpired(now: DateTime): boolean {
        return DateTime.fromJSDate(this.expiresAt) <= now;
    }
}
