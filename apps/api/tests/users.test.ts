import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES } from '@bzim/types';
import type { HandleAvailableResponse, MeResponse, UserSummary } from '@bzim/types';

import { env } from '../src/config/app';
import User from '../src/app/models/User.entity';
import { hashPassword, verifyPassword } from '../src/app/utils/Password';
import { cookieHeader, sessionFor, setCookies } from './support/auth';
import { api, asUser, data, error } from './support/client';
import { seedUser } from './support/factories';

describe('GET /me', () => {
    it('answers the account with its sign-in methods and onboarding state', async () => {
        const user = await seedUser({ handle: null, displayName: null, avatarKey: null });
        const { accessToken } = await sessionFor(user);

        const me = data<MeResponse>(await asUser(accessToken).get(API_ENDPOINTS.ME.ROOT));

        expect(me.id).toBe(user.id);
        expect(me.email).toBe(user.email);
        expect(me.onboardingDone).toBe(false);
        expect(me.hasGoogle).toBe(true);
        expect(me.hasPassword).toBe(false);
        expect(me.locale).toBe('nl');
        expect(me.notifyEmailInvites).toBe(true);
    });

    it('needs a session', async () => {
        expect((await api.get(API_ENDPOINTS.ME.ROOT)).status).toBe(401);
    });
});

describe('PATCH /me', () => {
    it('completes onboarding in one call and lowercases the handle', async () => {
        const user = await seedUser({ handle: null, displayName: null, avatarKey: null });
        const { accessToken } = await sessionFor(user);

        const me = data<MeResponse>(
            await asUser(accessToken).patch(API_ENDPOINTS.ME.ROOT, {
                handle: ' Milo_01 ',
                displayName: '  Milo  ',
                avatarKey: 'owl',
                locale: 'en',
            }),
        );

        expect(me.handle).toBe('milo_01');
        expect(me.displayName).toBe('Milo');
        expect(me.avatarKey).toBe('owl');
        expect(me.locale).toBe('en');
        expect(me.onboardingDone).toBe(true);
    });

    it('refuses a handle somebody else holds, by any casing', async () => {
        await seedUser({ handle: 'taken' });
        const user = await seedUser();
        const { accessToken } = await sessionFor(user);

        const response = await asUser(accessToken).patch(API_ENDPOINTS.ME.ROOT, {
            handle: 'TAKEN',
        });

        expect(response.status).toBe(409);
        expect(error(response).code).toBe(ERROR_CODES.CONFLICT);
        expect(error(response).details).toEqual({ field: 'handle' });
    });

    it('lets a person keep their own handle while changing something else', async () => {
        const user = await seedUser({ handle: 'mine' });
        const { accessToken } = await sessionFor(user);

        const response = await asUser(accessToken).patch(API_ENDPOINTS.ME.ROOT, {
            handle: 'mine',
            notifyEmailNewActivity: false,
        });

        expect(response.status).toBe(200);
        expect(data<MeResponse>(response).notifyEmailNewActivity).toBe(false);
    });

    it('validates the handle, the avatar and the empty body', async () => {
        const user = await seedUser();
        const { accessToken } = await sessionFor(user);
        const client = asUser(accessToken);

        expect((await client.patch(API_ENDPOINTS.ME.ROOT, { handle: 'no spaces' })).status).toBe(
            422,
        );
        expect((await client.patch(API_ENDPOINTS.ME.ROOT, { handle: 'ab' })).status).toBe(422);
        expect((await client.patch(API_ENDPOINTS.ME.ROOT, { avatarKey: 'dragon' })).status).toBe(
            422,
        );
        expect((await client.patch(API_ENDPOINTS.ME.ROOT, {})).status).toBe(422);
    });
});

describe('PATCH /me/password', () => {
    it('lets a Google-only account set a password without a current one', async () => {
        const user = await seedUser({ passwordHash: null });
        const { accessToken } = await sessionFor(user);

        const response = await asUser(accessToken).patch(API_ENDPOINTS.ME.PASSWORD, {
            newPassword: 'a brand new passphrase',
        });

        expect(response.status).toBe(204);
        const fresh = await User.findOneByOrFail({ id: user.id });
        expect(await verifyPassword('a brand new passphrase', fresh.passwordHash ?? '')).toBe(true);
    });

    it('requires and checks the current password when there is one', async () => {
        const user = await seedUser({ passwordHash: await hashPassword('old passphrase') });
        const { accessToken } = await sessionFor(user);
        const client = asUser(accessToken);

        const missing = await client.patch(API_ENDPOINTS.ME.PASSWORD, {
            newPassword: 'a brand new passphrase',
        });
        expect(missing.status).toBe(401);
        expect(error(missing).code).toBe(ERROR_CODES.INVALID_CREDENTIALS);

        const wrong = await client.patch(API_ENDPOINTS.ME.PASSWORD, {
            currentPassword: 'not it',
            newPassword: 'a brand new passphrase',
        });
        expect(wrong.status).toBe(401);

        const right = await client.patch(API_ENDPOINTS.ME.PASSWORD, {
            currentPassword: 'old passphrase',
            newPassword: 'a brand new passphrase',
        });
        expect(right.status).toBe(204);
    });

    it('signs out other sessions and keeps this one', async () => {
        const user = await seedUser({ passwordHash: null });
        const here = await sessionFor(user);
        const elsewhere = await sessionFor(user);

        const response = await api
            .patch(API_ENDPOINTS.ME.PASSWORD)
            .set('Cookie', here.cookie)
            .set('Origin', env.appUrl)
            .send({ newPassword: 'a brand new passphrase' });

        expect(response.status).toBe(204);
        const fresh = setCookies(response.headers);
        expect(fresh.refresh_token).toBeTruthy();

        const other = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, elsewhere.refreshToken))
            .set('Origin', env.appUrl);
        expect(other.status).toBe(401);

        const mine = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, fresh.refresh_token))
            .set('Origin', env.appUrl);
        expect(mine.status).toBe(204);
    });
});

describe('GET /users/handle-available', () => {
    it('says whether a handle can be claimed', async () => {
        await seedUser({ handle: 'taken' });
        const user = await seedUser({ handle: 'mine' });
        const { accessToken } = await sessionFor(user);
        const client = asUser(accessToken);

        const check = async (handle: string) =>
            data<HandleAvailableResponse>(
                await client.get(`${API_ENDPOINTS.USERS.HANDLE_AVAILABLE}?handle=${handle}`),
            ).available;

        expect(await check('free_one')).toBe(true);
        expect(await check('Taken')).toBe(false);
        expect(await check('mine')).toBe(true);
        expect(await check('ab')).toBe(false);
        expect(await check('has%20space')).toBe(false);
    });
});

describe('GET /users/search', () => {
    it('matches the start of a handle, never the caller, never the unfinished', async () => {
        const caller = await seedUser({ handle: 'anna' });
        await seedUser({ handle: 'annabel', displayName: 'Annabel' });
        await seedUser({ handle: 'annette' });
        await seedUser({ handle: 'joanna' });
        await seedUser({ handle: null, displayName: null, avatarKey: null });
        const { accessToken } = await sessionFor(caller);

        const results = data<UserSummary[]>(
            await asUser(accessToken).get(`${API_ENDPOINTS.USERS.SEARCH}?q=ANN`),
        );

        expect(results.map((u) => u.handle)).toEqual(['annabel', 'annette']);
        expect(results[0]).toEqual({
            id: expect.any(String) as string,
            handle: 'annabel',
            displayName: 'Annabel',
            avatarKey: 'fox',
        });
        expect(JSON.stringify(results)).not.toContain('@example.com');
    });

    it('treats LIKE wildcards as plain characters', async () => {
        const caller = await seedUser({ handle: 'caller' });
        await seedUser({ handle: 'percent' });
        const { accessToken } = await sessionFor(caller);

        const results = data<UserSummary[]>(
            await asUser(accessToken).get(`${API_ENDPOINTS.USERS.SEARCH}?q=%25%25`),
        );

        expect(results).toEqual([]);
    });
});

describe('DELETE /me', () => {
    it('removes the account, its sessions, and clears the cookies', async () => {
        const user = await seedUser();
        const { cookie, refreshToken } = await sessionFor(user);

        const response = await api
            .delete(API_ENDPOINTS.ME.ROOT)
            .set('Cookie', cookie)
            .set('Origin', env.appUrl);

        expect(response.status).toBe(204);
        expect(setCookies(response.headers)).toEqual({ access_token: '', refresh_token: '' });
        expect(await User.countBy({ id: user.id })).toBe(0);

        const refresh = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, refreshToken))
            .set('Origin', env.appUrl);
        expect(refresh.status).toBe(401);
    });
});
