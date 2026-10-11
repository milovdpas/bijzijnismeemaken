import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS } from '@bzim/types';

import { env } from '../src/config/app';
import GoogleAuthModule from '../src/app/infrastructure/modules/google/GoogleAuthModule';
import type { GoogleProfile } from '../src/app/infrastructure/modules/google/GoogleAuthModule';
import OAuthState from '../src/app/domain/models/OAuthState.entity';
import User from '../src/app/domain/models/User.entity';
import { setCookies } from './support/auth';
import { api } from './support/client';
import { seedUser } from './support/factories';

/**
 * Google is never called. The redirect URL is real (built from the test
 * client id), and the code exchange is replaced with a profile of our choosing.
 */
function googleAnswers(profile: Partial<GoogleProfile> = {}) {
    const full: GoogleProfile = {
        sub: 'google-sub-1',
        email: 'Milo@Example.com',
        emailVerified: true,
        ...profile,
    };
    return vi.spyOn(GoogleAuthModule, 'exchangeCode').mockResolvedValue(full);
}

function googleFails() {
    return vi.spyOn(GoogleAuthModule, 'exchangeCode').mockRejectedValue(new Error('invalid_grant'));
}

/** The state cookie the last start set: the browser that began the login carries it back. */
let stateCookie = '';

/** Starts a login and returns the state Google would hand back. */
async function startedState(returnTo?: string): Promise<string> {
    const response = await api.get(API_ENDPOINTS.AUTH.GOOGLE).query(returnTo ? { returnTo } : {});
    expect(response.status).toBe(302);
    stateCookie = setCookies(response.headers).oauth_state ?? '';
    const location = new URL(response.headers.location ?? '');
    return location.searchParams.get('state') ?? '';
}

function callback(state: string, code = 'code-123') {
    return api
        .get(API_ENDPOINTS.AUTH.GOOGLE_CALLBACK)
        .set('Cookie', `oauth_state=${stateCookie}`)
        .query({ state, code });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('GET /auth/google', () => {
    it('redirects to Google with a stored state and the right scopes', async () => {
        const response = await api
            .get(API_ENDPOINTS.AUTH.GOOGLE)
            .query({ returnTo: '/groups/abc' });

        expect(response.status).toBe(302);
        const location = new URL(response.headers.location ?? '');
        expect(location.hostname).toBe('accounts.google.com');
        expect(location.searchParams.get('scope')).toBe('openid email profile');
        expect(location.searchParams.get('redirect_uri')).toBe(
            `${env.apiUrl}${API_ENDPOINTS.AUTH.GOOGLE_CALLBACK}`,
        );

        const state = location.searchParams.get('state') ?? '';
        const row = await OAuthState.findOneByOrFail({ state });
        expect(row.returnTo).toBe('/groups/abc');
        expect(row.userId).toBeNull();
    });

    it('drops a returnTo that points off the app', async () => {
        const state = await startedState('https://evil.example/phish');
        const row = await OAuthState.findOneByOrFail({ state });
        expect(row.returnTo).toBeNull();

        const protocolRelative = await startedState('//evil.example');
        expect((await OAuthState.findOneByOrFail({ state: protocolRelative })).returnTo).toBeNull();
    });
});

describe('GET /auth/google/callback', () => {
    it('creates an account on first login and sends it to onboarding', async () => {
        googleAnswers();
        const state = await startedState();

        const response = await callback(state);

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe(`${env.appUrl}/onboarding`);
        const cookies = setCookies(response.headers);
        expect(cookies.access_token).toBeTruthy();
        expect(cookies.refresh_token).toBeTruthy();

        const user = await User.findOneByOrFail({ googleSub: 'google-sub-1' });
        expect(user.email).toBe('milo@example.com');
        expect(user.emailVerified()).toBe(true);
        expect(user.passwordHash).toBeNull();
        expect(user.lastLoginAt).not.toBeNull();
    });

    it('sends an onboarded user to where they were going', async () => {
        const user = await seedUser({ googleSub: 'google-sub-1' });
        googleAnswers({ email: user.email });
        const state = await startedState('/groups/xyz/activities');

        const response = await callback(state);

        expect(response.headers.location).toBe(`${env.appUrl}/groups/xyz/activities`);
        expect(await User.count()).toBe(1);
    });

    it('links a Google login to an existing verified password account', async () => {
        const user = await seedUser({
            googleSub: null,
            passwordHash: 'scrypt$32768$8$1$salt$hash',
            email: 'shared@example.com',
        });
        googleAnswers({ sub: 'google-sub-9', email: 'Shared@Example.com' });

        await callback(await startedState());

        const linked = await User.findOneByOrFail({ id: user.id });
        expect(linked.googleSub).toBe('google-sub-9');
        expect(linked.passwordHash).toBe('scrypt$32768$8$1$salt$hash');
    });

    it('takes over an unverified password account and drops its password', async () => {
        const user = await seedUser({
            googleSub: null,
            passwordHash: 'scrypt$32768$8$1$salt$hash',
            emailVerifiedAt: null,
            email: 'claimed@example.com',
        });
        googleAnswers({ sub: 'google-sub-9', email: 'claimed@example.com' });

        await callback(await startedState());

        const taken = await User.findOneByOrFail({ id: user.id });
        expect(taken.googleSub).toBe('google-sub-9');
        expect(taken.emailVerified()).toBe(true);
        expect(taken.passwordHash).toBeNull();
    });

    it('refuses a callback from a browser other than the one that started', async () => {
        googleAnswers();
        const state = await startedState();

        // The attacker's own state, pasted into a victim's browser: no cookie there.
        const elsewhere = await api.get(API_ENDPOINTS.AUTH.GOOGLE_CALLBACK).query({
            state,
            code: 'code-123',
        });

        expect(elsewhere.headers.location).toBe(`${env.appUrl}/login?error=google_state`);
        expect(setCookies(elsewhere.headers).access_token).toBeUndefined();
        expect(await User.count()).toBe(0);
        // The browser that started can still finish.
        expect((await callback(state)).headers.location).toBe(`${env.appUrl}/onboarding`);
    });

    it('refuses an unknown, replayed or expired state', async () => {
        googleAnswers();

        const unknown = await callback('not-a-state');
        expect(unknown.headers.location).toBe(`${env.appUrl}/login?error=google_state`);

        const state = await startedState();
        await callback(state);
        const replayed = await callback(state);
        expect(replayed.headers.location).toBe(`${env.appUrl}/login?error=google_state`);
        expect(setCookies(replayed.headers).access_token).toBeUndefined();
    });

    it('goes back to the login page when Google refuses the code', async () => {
        googleFails();

        const response = await callback(await startedState());

        expect(response.headers.location).toBe(`${env.appUrl}/login?error=google_failed`);
        expect(await User.count()).toBe(0);
    });

    it('goes back to the login page when the person cancelled', async () => {
        const state = await startedState();

        const response = await api
            .get(API_ENDPOINTS.AUTH.GOOGLE_CALLBACK)
            .query({ state, error: 'access_denied' });

        expect(response.headers.location).toBe(`${env.appUrl}/login?error=google_cancelled`);
    });

    it('refuses an address Google itself has not verified', async () => {
        googleAnswers({ emailVerified: false });

        const response = await callback(await startedState());

        expect(response.headers.location).toBe(`${env.appUrl}/login?error=google_failed`);
        expect(await User.count()).toBe(0);
    });
});
