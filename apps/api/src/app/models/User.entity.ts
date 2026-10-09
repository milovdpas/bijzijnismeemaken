import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Locale } from '@bzim/types';
import type { AvatarKey } from '@bzim/types';

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

    @Column({ type: 'varchar', length: 255, unique: true })
    email!: string;

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

    @Column({ name: 'notify_email_invites', type: 'boolean', default: true })
    notifyEmailInvites!: boolean;

    @Column({ name: 'notify_email_planned', type: 'boolean', default: true })
    notifyEmailPlanned!: boolean;

    @Column({ name: 'notify_email_new_activity', type: 'boolean', default: true })
    notifyEmailNewActivity!: boolean;

    @Column({ name: 'last_login_at', type: 'datetime', precision: 3, nullable: true })
    lastLoginAt!: Date | null;

    @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
    updatedAt!: Date;

    /** A password account may not sign in before its address is confirmed. */
    emailVerified(): boolean {
        return this.emailVerifiedAt !== null;
    }

    /** Whether the profile is complete enough to take part in a group. */
    onboardingDone(): boolean {
        return this.handle !== null && this.displayName !== null && this.avatarKey !== null;
    }
}
