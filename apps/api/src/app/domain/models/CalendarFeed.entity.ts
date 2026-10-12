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
import type { CalendarConnectionStatus, CalendarFeedDto, CalendarFeedProblem } from '@bzim/types';

import TokenCrypto from '../../infrastructure/utils/TokenCrypto';
import User from './User.entity';

/**
 * A calendar read through a link (docs/02 §2.6): Apple's public calendar,
 * Outlook's published one, any iCalendar feed. Read-only, so it only ever
 * says when somebody is busy. The link is the key to the calendar: stored
 * encrypted, never sent back, and found again by its keyed hash.
 */
@Entity('calendar_feeds')
export default class CalendarFeed extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ name: 'url_enc', type: 'varbinary', length: 2048, transformer: TokenCrypto.column() })
    url!: string;

    @Column({ name: 'url_hash', type: 'char', length: 64 })
    urlHash!: string;

    @Column({ type: 'varchar', length: 255 })
    host!: string;

    /** `reauth_required` once the link is switched off: it needs replacing, not retrying. */
    @Column({ type: 'varchar', length: 16 })
    status!: CalendarConnectionStatus;

    @Column({ name: 'last_synced_at', type: 'datetime', precision: 3, nullable: true })
    lastSyncedAt!: Date | null;

    @Column({ name: 'last_error', type: 'varchar', length: 16, nullable: true })
    lastError!: CalendarFeedProblem | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** The link stays on the server. */
    toDto(): CalendarFeedDto {
        return {
            id: this.id,
            name: this.name,
            host: this.host,
            status: this.status,
            lastSyncedAt: this.lastSyncedAt?.toISOString() ?? null,
            lastError: this.lastError,
            createdAt: this.createdAt.toISOString(),
        };
    }
}
