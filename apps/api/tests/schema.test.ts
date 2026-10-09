import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import EmailToken, { EmailTokenPurpose } from '../src/app/models/EmailToken.entity';
import OAuthState, { OAuthPurpose } from '../src/app/models/OAuthState.entity';
import RefreshToken from '../src/app/models/RefreshToken.entity';
import User from '../src/app/models/User.entity';
import { hashToken } from '../src/app/utils/Token';
import { seedUser } from './support/factories';

/**
 * The constraints the migration promises, checked against the real database.
 *
 * These are about the schema, not about any endpoint: a unique that is missing
 * or an ON DELETE that is wrong only shows up as a bug months later, in a
 * feature that trusted it.
 */

const inAnHour = () => DateTime.utc().plus({ hours: 1 }).toJSDate();

describe('users', () => {
    it('stores the defaults a fresh login gets', async () => {
        const user = await seedUser({ handle: null, displayName: null, avatarKey: null });

        const fresh = await User.findOneByOrFail({ id: user.id });
        expect(fresh.locale).toBe('nl');
        expect(fresh.autoAddToCalendar).toBe(false);
        expect(fresh.notifyEmailInvites).toBe(true);
        expect(fresh.notifyEmailPlanned).toBe(true);
        expect(fresh.notifyEmailNewActivity).toBe(true);
        expect(fresh.onboardingDone()).toBe(false);
    });

    it('knows when onboarding is complete', async () => {
        const user = await seedUser();
        expect(user.onboardingDone()).toBe(true);
    });

    it('refuses a second account for the same Google subject', async () => {
        const first = await seedUser();
        await expect(seedUser({ googleSub: first.googleSub })).rejects.toThrow(/Duplicate entry/);
    });

    it('refuses a second account for the same email', async () => {
        const first = await seedUser();
        await expect(seedUser({ email: first.email })).rejects.toThrow(/Duplicate entry/);
    });

    it('refuses a handle somebody holds, regardless of case', async () => {
        const first = await seedUser({ handle: 'milo' });
        await expect(seedUser({ handle: 'MILO' })).rejects.toThrow(/Duplicate entry/);
        expect(first.handle).toBe('milo');
    });

    it('allows many password-only accounts, which have no Google subject', async () => {
        await seedUser({ googleSub: null, passwordHash: 'scrypt' });
        await seedUser({ googleSub: null, passwordHash: 'scrypt' });
        expect(await User.count()).toBe(2);
    });

    it('treats a fresh password account as unverified', async () => {
        const user = await seedUser({ googleSub: null, emailVerifiedAt: null });
        expect(user.emailVerified()).toBe(false);
    });

    it('allows many users who have not chosen a handle yet', async () => {
        await seedUser({ handle: null });
        await seedUser({ handle: null });
        expect(await User.count()).toBe(2);
    });
});

describe('refresh tokens', () => {
    it('go with the user', async () => {
        const user = await seedUser();
        await RefreshToken.create({
            userId: user.id,
            tokenHash: hashToken(randomUUID()),
            familyId: randomUUID(),
            expiresAt: inAnHour(),
            revokedAt: null,
            replacedById: null,
            userAgent: 'vitest',
        }).save();

        await user.remove();

        expect(await RefreshToken.count()).toBe(0);
    });

    it('are usable only while unexpired and unrevoked', () => {
        const now = DateTime.utc();
        const live = RefreshToken.create({ expiresAt: inAnHour(), revokedAt: null });
        const revoked = RefreshToken.create({ expiresAt: inAnHour(), revokedAt: now.toJSDate() });
        const expired = RefreshToken.create({
            expiresAt: now.minus({ minutes: 1 }).toJSDate(),
            revokedAt: null,
        });

        expect(live.isUsable(now)).toBe(true);
        expect(revoked.isUsable(now)).toBe(false);
        expect(expired.isUsable(now)).toBe(false);
    });
});

describe('oauth states', () => {
    it('can belong to nobody, for a login', async () => {
        const state = await OAuthState.create({
            state: randomUUID(),
            purpose: OAuthPurpose.LOGIN,
            userId: null,
            returnTo: '/groups',
            expiresAt: inAnHour(),
        }).save();

        const fresh = await OAuthState.findOneByOrFail({ id: state.id });
        expect(fresh.userId).toBeNull();
        expect(fresh.isExpired(DateTime.utc())).toBe(false);
    });

    it('go with the user who started a calendar connection', async () => {
        const user = await seedUser();
        await OAuthState.create({
            state: randomUUID(),
            purpose: OAuthPurpose.CALENDAR_READ,
            userId: user.id,
            returnTo: null,
            expiresAt: inAnHour(),
        }).save();

        await user.remove();

        expect(await OAuthState.count()).toBe(0);
    });
});

describe('email tokens', () => {
    it('go with the user and are spent, not deleted', async () => {
        const user = await seedUser();
        const token = await EmailToken.create({
            userId: user.id,
            purpose: EmailTokenPurpose.VERIFY_EMAIL,
            tokenHash: hashToken(randomUUID()),
            expiresAt: inAnHour(),
            usedAt: null,
        }).save();

        const now = DateTime.utc();
        expect(token.isUsable(now)).toBe(true);
        token.usedAt = now.toJSDate();
        expect(token.isUsable(now)).toBe(false);

        await user.remove();
        expect(await EmailToken.count()).toBe(0);
    });
});
