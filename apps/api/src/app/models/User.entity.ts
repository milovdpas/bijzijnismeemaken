import {
    BaseEntity,
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Locale } from '@bzim/types';
import type { AvatarKey, MeResponse, UserSummary } from '@bzim/types';

import Crypt from '../utils/Crypt';

/**
 * An account. Created on first Google login; completed by onboarding.
 *
 * `handle`, `displayName` and `avatarKey` are null until onboarding has run,
 * and `onboardingDone()` is how the rest of the API asks. Everything a group
 * shows about a person comes from here, never from Google: the display name is
 * chosen, not the real name.
 */
@Entity('users')
export default class User extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /** Google's stable subject id; null for an account that only has a password. */
    @Column({ name: 'google_sub', type: 'varchar', length: 64, nullable: true, unique: true })
    googleSub!: string | null;

    /** Encrypted at rest; plain here. Looked up through `emailHash`, never directly. */
    @Column({ type: 'text', transformer: Crypt.encryptColumn() })
    email!: string;

    /** Keyed blind index of the lowercased email: the unique constraint and the lookup. */
    @Column({ name: 'email_hash', type: 'char', length: 64, unique: true })
    emailHash!: string;

    /** scrypt hash (see `utils/Password.ts`); null for a Google-only account. */
    @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
    passwordHash!: string | null;

    /** Google vouched for the address, or the verification link was clicked. */
    @Column({ name: 'email_verified_at', type: 'datetime', precision: 3, nullable: true })
    emailVerifiedAt!: Date | null;

    /** Lowercase, unique; how invites find a person. */
    @Column({ type: 'varchar', length: 24, nullable: true, unique: true })
    handle!: string | null;

    @Column({ name: 'display_name', type: 'varchar', length: 40, nullable: true })
    displayName!: string | null;

    @Column({ name: 'avatar_key', type: 'varchar', length: 32, nullable: true })
    avatarKey!: AvatarKey | null;

    @Column({ type: 'varchar', length: 2, default: Locale.NL })
    locale!: Locale;

    /** Planned activities are written to the user's own calendar (needs the write scope). */
    @Column({ name: 'auto_add_to_calendar', type: 'boolean', default: false })
    autoAddToCalendar!: boolean;

    @Column({ name: 'last_login_at', type: 'datetime', precision: 3, nullable: true })
    lastLoginAt!: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** The one way to find an account by address; the column itself is ciphertext. */
    static findByEmail(email: string): Promise<User | null> {
        return this.findOneBy({ emailHash: Crypt.searchHash(email) });
    }

    /**
     * Keeps the blind index in step with the address on every write, so no
     * caller has to remember to set it.
     */
    @BeforeInsert()
    @BeforeUpdate()
    protected indexEmail(): void {
        this.emailHash = Crypt.searchHash(this.email);
    }

    /** A password account may not sign in before its address is confirmed. */
    emailVerified(): boolean {
        return this.emailVerifiedAt !== null;
    }

    /** Whether the profile is complete enough to take part in a group. */
    onboardingDone(): boolean {
        return this.handle !== null && this.displayName !== null && this.avatarKey !== null;
    }

    /** The account as its owner sees it. The only DTO that carries the email. */
    toDto(): MeResponse {
        return {
            id: this.id,
            email: this.email,
            handle: this.handle,
            displayName: this.displayName,
            avatarKey: this.avatarKey,
            locale: this.locale,
            onboardingDone: this.onboardingDone(),
            hasPassword: this.passwordHash !== null,
            hasGoogle: this.googleSub !== null,
            autoAddToCalendar: this.autoAddToCalendar,
            createdAt: this.createdAt.toISOString(),
        };
    }

    /**
     * What other members see, or null for an account that has not finished
     * onboarding and so has nothing to show yet.
     */
    toSummary(): UserSummary | null {
        if (this.handle === null || this.displayName === null || this.avatarKey === null) {
            return null;
        }
        return {
            id: this.id,
            handle: this.handle,
            displayName: this.displayName,
            avatarKey: this.avatarKey,
        };
    }
}
