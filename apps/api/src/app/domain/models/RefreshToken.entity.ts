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

/**
 * One issued refresh token.
 *
 * The id is the JWT's `jti`, so a presented token is looked up by id and the
 * hash of its value is compared. Rotation inserts a new row and marks this one
 * revoked with `replacedById`; presenting a revoked token again means it
 * leaked, and the whole `familyId` is revoked in response.
 */
@Entity('refresh_tokens')
export default class RefreshToken extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'char', length: 36 })
    userId!: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    /** SHA-256 of the token value; the value itself is only ever in the cookie. */
    @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
    tokenHash!: string;

    /** Shared by every rotation that descends from one login. */
    @Column({ name: 'family_id', type: 'char', length: 36 })
    familyId!: string;

    @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
    expiresAt!: Date;

    @Column({ name: 'revoked_at', type: 'datetime', precision: 3, nullable: true })
    revokedAt!: Date | null;

    @Column({ name: 'replaced_by_id', type: 'char', length: 36, nullable: true })
    replacedById!: string | null;

    @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
    userAgent!: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    isUsable(now: DateTime): boolean {
        return this.revokedAt === null && DateTime.fromJSDate(this.expiresAt) > now;
    }
}
