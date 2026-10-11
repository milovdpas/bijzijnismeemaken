import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import type {
    CalendarConnectionDto,
    CalendarConnectionStatus,
    CalendarProviderKey,
} from '@bzim/types';

import Crypt from '../../infrastructure/utils/Crypt';
import TokenCrypto from '../../infrastructure/utils/TokenCrypto';
import CalendarSource from './CalendarSource.entity';
import User from './User.entity';

/**
 * A person's link to a calendar provider (docs/02 §2.6). The tokens are
 * encrypted under their own key and read as plain strings here; the account
 * email is encrypted like the user's own, with a keyed hash for uniqueness.
 * One connection per user in the MVP; the unique key allows more later.
 */
@Entity('calendar_connections')
export default class CalendarConnection extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ type: 'varchar', length: 16 })
    provider!: CalendarProviderKey;

    @Column({ name: 'account_email', type: 'text', transformer: Crypt.encryptColumn() })
    accountEmail!: string;

    @Column({ name: 'account_email_hash', type: 'char', length: 64 })
    accountEmailHash!: string;

    @Column({
        name: 'refresh_token_enc',
        type: 'varbinary',
        length: 1024,
        transformer: TokenCrypto.column(),
    })
    refreshToken!: string;

    @Column({
        name: 'access_token_enc',
        type: 'varbinary',
        length: 2048,
        nullable: true,
        transformer: TokenCrypto.column(),
    })
    accessToken!: string | null;

    @Column({ name: 'access_token_expires_at', type: 'datetime', precision: 3, nullable: true })
    accessTokenExpiresAt!: Date | null;

    /** Space-separated, as Google reports them. */
    @Column({ type: 'varchar', length: 500 })
    scopes!: string;

    @Column({ name: 'has_write_scope', type: 'boolean', default: false })
    hasWriteScope!: boolean;

    @Column({ type: 'varchar', length: 16 })
    status!: CalendarConnectionStatus;

    @Column({ name: 'last_synced_at', type: 'datetime', precision: 3, nullable: true })
    lastSyncedAt!: Date | null;

    @Column({ name: 'last_error', type: 'varchar', length: 500, nullable: true })
    lastError!: string | null;

    @OneToMany(() => CalendarSource, (source) => source.connection)
    sources!: CalendarSource[];

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** Needs `sources` loaded. Tokens never leave the server. */
    toDto(): CalendarConnectionDto {
        if (this.sources === undefined) {
            throw new Error(`Calendar connection ${this.id} was loaded without its sources`);
        }
        return {
            id: this.id,
            provider: this.provider,
            accountEmail: this.accountEmail,
            hasWriteScope: this.hasWriteScope,
            status: this.status,
            lastSyncedAt: this.lastSyncedAt?.toISOString() ?? null,
            lastError: this.lastError,
            sources: this.sources.map((source) => source.toDto()),
            createdAt: this.createdAt.toISOString(),
        };
    }
}
