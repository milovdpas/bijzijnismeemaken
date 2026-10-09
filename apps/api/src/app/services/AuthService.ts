import { DateTime } from 'luxon';
import { Locale } from '@bzim/types';

import GoogleAuthModule from '../modules/google/GoogleAuthModule';
import OAuthState, { OAuthPurpose } from '../models/OAuthState.entity';
import User from '../models/User.entity';
import { DUMMY_HASH_PROMISE, hashPassword, verifyPassword } from '../utils/Password';
import { generateToken } from '../utils/Token';

/** How long a Google round trip may take before the state is stale. */
const OAUTH_STATE_MINUTES = 10;

export type GoogleLoginResult =
    | { ok: true; user: User; returnTo: string | null }
    | { ok: false; problem: 'STATE_INVALID' | 'GOOGLE_FAILED' | 'EMAIL_UNVERIFIED_AT_GOOGLE' };

export type RegisterResult = { ok: true; user: User } | { ok: false; problem: 'EMAIL_TAKEN' };

export type LoginResult =
    { ok: true; user: User } | { ok: false; problem: 'INVALID_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' };

/**
 * Who a person is, by Google or by password. Sessions are the
 * `SessionService`'s business; this only establishes the user.
 */
export class AuthService {
    private readonly google = new GoogleAuthModule();

    /** The URL to send the browser to. `returnTo` is already validated. */
    async startGoogleLogin(returnTo: string | null): Promise<string> {
        const state = generateToken();
        await OAuthState.create({
            state,
            purpose: OAuthPurpose.LOGIN,
            userId: null,
            returnTo,
            expiresAt: DateTime.utc().plus({ minutes: OAUTH_STATE_MINUTES }).toJSDate(),
        }).save();
        return this.google.authUrl(state);
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
    async completeGoogleLogin(state: string, code: string): Promise<GoogleLoginResult> {
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
            profile = await this.google.exchangeCode(code);
        } catch (error) {
            console.error('Google code exchange failed:', error);
            return { ok: false, problem: 'GOOGLE_FAILED' };
        }
        if (!profile.emailVerified) {
            return { ok: false, problem: 'EMAIL_UNVERIFIED_AT_GOOGLE' };
        }

        const email = profile.email.toLowerCase();
        const now = DateTime.utc().toJSDate();
        let user = await User.findOneBy({ googleSub: profile.sub });

        if (user === null) {
            user = await User.findOneBy({ email });
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

    /** A new password account, unverified until the emailed link is clicked (task 8b). */
    async register(email: string, password: string, locale: Locale): Promise<RegisterResult> {
        const normalised = email.toLowerCase();
        if ((await User.findOneBy({ email: normalised })) !== null) {
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
        return { ok: true, user };
    }

    /**
     * Email and password. Wrong email and wrong password are the same answer
     * and take the same time, so the response says nothing about whether the
     * address is registered.
     */
    async login(email: string, password: string): Promise<LoginResult> {
        const user = await User.findOneBy({ email: email.toLowerCase() });
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
