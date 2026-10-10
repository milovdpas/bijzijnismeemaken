import { DateTime } from 'luxon';
import { Locale } from '@bzim/types';

import { env } from '../../config/app';
import GoogleAuthModule from '../modules/google/GoogleAuthModule';
import { deliver } from '../modules/mail';
import { renderResetPassword, renderVerifyEmail } from '../modules/mail/templates';
import { EmailTokenPurpose } from '../models/EmailToken.entity';
import OAuthState, { OAuthPurpose } from '../models/OAuthState.entity';
import User from '../models/User.entity';
import { DUMMY_HASH_PROMISE, hashPassword, verifyPassword } from '../utils/Password';
import { normalizeEmail } from '../utils/Normalize';
import { generateToken } from '../utils/Token';
import { EmailTokenService } from './EmailTokenService';
import { SessionService } from './SessionService';

/** How long a Google round trip may take before the state is stale. */
const OAUTH_STATE_MINUTES = 10;

export type GoogleLoginResult =
    | { ok: true; user: User; returnTo: string | null }
    | { ok: false; problem: 'STATE_INVALID' | 'GOOGLE_FAILED' | 'EMAIL_UNVERIFIED_AT_GOOGLE' };

export type RegisterResult = { ok: true; user: User } | { ok: false; problem: 'EMAIL_TAKEN' };

export type LoginResult =
    { ok: true; user: User } | { ok: false; problem: 'INVALID_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' };

export type TokenResult = { ok: true; user: User } | { ok: false; problem: 'TOKEN_INVALID' };

/**
 * Who a person is, by Google or by password, and the emailed links that prove
 * an address. Sessions are the `SessionService`'s business; this only
 * establishes the user.
 */
export class AuthService {
    /** The URL to send the browser to. `returnTo` is already validated. */
    static async startGoogleLogin(returnTo: string | null): Promise<string> {
        const state = generateToken();
        await OAuthState.create({
            state,
            purpose: OAuthPurpose.LOGIN,
            userId: null,
            returnTo,
            expiresAt: DateTime.utc().plus({ minutes: OAUTH_STATE_MINUTES }).toJSDate(),
        }).save();
        return GoogleAuthModule.authUrl(state);
    }

    /**
     * The callback. The state row is consumed whatever happens next, so a
     * replayed callback URL is refused.
     *
     * One account per email. A Google login on an address that already has an
     * account links the two. If that account was a password account whose
     * address was never verified, the person who registered it never proved
     * they own the address and the Google user just did: the password is
     * dropped so it cannot be used to get into the account.
     */
    static async completeGoogleLogin(state: string, code: string): Promise<GoogleLoginResult> {
        const row = await OAuthState.findOneBy({ state, purpose: OAuthPurpose.LOGIN });
        if (row === null) {
            return { ok: false, problem: 'STATE_INVALID' };
        }
        await row.remove();
        if (row.isExpired(DateTime.utc())) {
            return { ok: false, problem: 'STATE_INVALID' };
        }

        let profile;
        try {
            profile = await GoogleAuthModule.exchangeCode(code);
        } catch (error) {
            console.error('Google code exchange failed:', error);
            return { ok: false, problem: 'GOOGLE_FAILED' };
        }
        if (!profile.emailVerified) {
            return { ok: false, problem: 'EMAIL_UNVERIFIED_AT_GOOGLE' };
        }

        const email = normalizeEmail(profile.email);
        const now = DateTime.utc().toJSDate();
        let user = await User.findOneBy({ googleSub: profile.sub });

        if (user === null) {
            user = await User.findByEmail(email);
            if (user !== null) {
                user.googleSub = profile.sub;
                if (!user.emailVerified()) {
                    user.emailVerifiedAt = now;
                    user.passwordHash = null;
                }
            } else {
                user = User.create({
                    googleSub: profile.sub,
                    email,
                    passwordHash: null,
                    emailVerifiedAt: now,
                    handle: null,
                    displayName: null,
                    avatarKey: null,
                    locale: Locale.NL,
                });
            }
        }

        user.lastLoginAt = now;
        await user.save();
        return { ok: true, user, returnTo: row.returnTo };
    }

    /** A new password account, unverified until the emailed link is clicked. */
    static async register(
        email: string,
        password: string,
        locale: Locale,
    ): Promise<RegisterResult> {
        const normalised = normalizeEmail(email);
        if ((await User.findByEmail(normalised)) !== null) {
            return { ok: false, problem: 'EMAIL_TAKEN' };
        }

        const user = await User.create({
            googleSub: null,
            email: normalised,
            passwordHash: await hashPassword(password),
            emailVerifiedAt: null,
            handle: null,
            displayName: null,
            avatarKey: null,
            locale,
        }).save();

        await AuthService.sendVerification(user);
        return { ok: true, user };
    }

    /**
     * Email and password. Wrong email and wrong password are the same answer
     * and take the same time, so the response says nothing about whether the
     * address is registered.
     */
    static async login(email: string, password: string): Promise<LoginResult> {
        const user = await User.findByEmail(email);
        const stored = user?.passwordHash ?? (await DUMMY_HASH_PROMISE);
        const matches = await verifyPassword(password, stored);

        if (user === null || user.passwordHash === null || !matches) {
            return { ok: false, problem: 'INVALID_CREDENTIALS' };
        }
        if (!user.emailVerified()) {
            return { ok: false, problem: 'EMAIL_NOT_VERIFIED' };
        }

        user.lastLoginAt = DateTime.utc().toJSDate();
        await user.save();
        return { ok: true, user };
    }

    /**
     * Another verification email, for a password account that is still
     * waiting on one. Silent otherwise: the caller learns nothing about
     * whether the address exists or is already verified.
     */
    static async resendVerification(email: string): Promise<void> {
        const user = await User.findByEmail(email);
        if (user !== null && user.passwordHash !== null && !user.emailVerified()) {
            await AuthService.sendVerification(user);
        }
    }

    /** The link was clicked: the address is confirmed and the person is signed in. */
    static async verifyEmail(token: string): Promise<TokenResult> {
        const userId = await EmailTokenService.consume(token, EmailTokenPurpose.VERIFY_EMAIL);
        const user = userId === null ? null : await User.findOneBy({ id: userId });
        if (user === null) {
            return { ok: false, problem: 'TOKEN_INVALID' };
        }

        const now = DateTime.utc().toJSDate();
        user.emailVerifiedAt ??= now;
        user.lastLoginAt = now;
        await user.save();
        return { ok: true, user };
    }

    /**
     * Sends a reset link if the address has an account. Any account, Google
     * only included: this is also how a Google user adds a password. Silent
     * when the address is unknown.
     */
    static async forgotPassword(email: string): Promise<void> {
        const user = await User.findByEmail(email);
        if (user === null) {
            return;
        }
        const token = await EmailTokenService.issue(user, EmailTokenPurpose.RESET_PASSWORD);
        const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
        await deliver(renderResetPassword(user.locale, user.email, link));
    }

    /**
     * Sets the new password and signs out every session: whoever holds an old
     * cookie should not keep access past a reset. Clicking the link also proves
     * the address, so an unverified account becomes verified here.
     */
    static async resetPassword(token: string, password: string): Promise<TokenResult> {
        const userId = await EmailTokenService.consume(token, EmailTokenPurpose.RESET_PASSWORD);
        const user = userId === null ? null : await User.findOneBy({ id: userId });
        if (user === null) {
            return { ok: false, problem: 'TOKEN_INVALID' };
        }

        user.passwordHash = await hashPassword(password);
        user.emailVerifiedAt ??= DateTime.utc().toJSDate();
        await user.save();
        await SessionService.revokeAllForUser(user.id);
        return { ok: true, user };
    }

    private static async sendVerification(user: User): Promise<void> {
        const token = await EmailTokenService.issue(user, EmailTokenPurpose.VERIFY_EMAIL);
        const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
        await deliver(renderVerifyEmail(user.locale, user.email, link));
    }
}

/**
 * A place inside the web app, or null.
 *
 * Only a path: anything with a scheme or a protocol-relative `//` would let a
 * crafted login link bounce the person to another site after signing in.
 */
export function safeReturnTo(value: string | undefined): string | null {
    if (
        value === undefined ||
        !value.startsWith('/') ||
        value.startsWith('//') ||
        value.includes('\\')
    ) {
        return null;
    }
    return value.slice(0, 255);
}
