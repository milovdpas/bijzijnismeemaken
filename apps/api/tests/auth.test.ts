import cookieParser from 'cookie-parser';
import express from 'express';
import supertest from 'supertest';
import { DateTime } from 'luxon';
import { IsNull, Not } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES } from '@bzim/types';

import { env } from '../src/config/app';
import { userAuth } from '../src/app/middleware/UserAuth';
import RefreshToken from '../src/app/models/RefreshToken.entity';
import JWT from '../src/app/utils/JWT';
import { cookieHeader, sessionFor, setCookies } from './support/auth';
import { api, error } from './support/client';
import { seedUser } from './support/factories';

/**
 * `userAuth` has no route of its own until task 9 adds `/me`, so it is probed
 * through a one-route app with the same cookie parsing the real app has.
 */
const probe = supertest(
    express()
        .use(cookieParser())
        .get('/probe', userAuth, (req, res) => {
            res.json({ userId: req.user.id });
        }),
);

describe('userAuth', () => {
    it('accepts the access cookie', async () => {
        const user = await seedUser();
        const { cookie } = await sessionFor(user);

        const response = await probe.get('/probe').set('Cookie', cookie);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ userId: user.id });
    });

    it('accepts a bearer header, for tools and tests', async () => {
        const user = await seedUser();
        const { accessToken } = await sessionFor(user);

        const response = await probe.get('/probe').set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
    });

    it('refuses a missing token', async () => {
        const response = await probe.get('/probe');

        expect(response.status).toBe(401);
        expect(error(response).code).toBe(ERROR_CODES.UNAUTHENTICATED);
    });

    it('refuses a refresh token used as an access token', async () => {
        const user = await seedUser();
        const { refreshToken } = await sessionFor(user);

        const response = await probe.get('/probe').set('Authorization', `Bearer ${refreshToken}`);

        expect(response.status).toBe(401);
    });

    it('refuses an expired token', async () => {
        const user = await seedUser();
        const expired = await JWT.sign({ sub: user.id, type: 'access' }, -1);

        const response = await probe.get('/probe').set('Authorization', `Bearer ${expired}`);

        expect(response.status).toBe(401);
    });

    it('refuses a token for a user who no longer exists', async () => {
        const user = await seedUser();
        const { accessToken } = await sessionFor(user);
        await user.remove();

        const response = await probe.get('/probe').set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(401);
    });
});

describe('POST /auth/refresh', () => {
    it('rotates the pair and revokes the presented token', async () => {
        const user = await seedUser();
        const { refreshToken } = await sessionFor(user);

        const response = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, refreshToken))
            .set('Origin', env.appUrl);

        expect(response.status).toBe(204);
        const cookies = setCookies(response.headers);
        expect(cookies.access_token).toBeTruthy();
        expect(cookies.refresh_token).toBeTruthy();
        expect(cookies.refresh_token).not.toBe(refreshToken);

        const rows = await RefreshToken.find({ order: { createdAt: 'ASC' } });
        expect(rows).toHaveLength(2);
        expect(rows[0]?.revokedAt).not.toBeNull();
        expect(rows[0]?.replacedById).toBe(rows[1]?.id);
        expect(rows[1]?.familyId).toBe(rows[0]?.familyId);
    });

    it('lets a second tab refresh with the old token moments after the first', async () => {
        const user = await seedUser();
        const { refreshToken: first } = await sessionFor(user);

        const tabA = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, first))
            .set('Origin', env.appUrl);
        const tabB = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, first))
            .set('Origin', env.appUrl);

        expect(tabA.status).toBe(204);
        expect(tabB.status).toBe(204);
        const a = setCookies(tabA.headers).refresh_token ?? '';
        const b = setCookies(tabB.headers).refresh_token ?? '';
        expect(a).not.toBe(b);
        // Both go on from here.
        for (const token of [a, b]) {
            const next = await api
                .post(API_ENDPOINTS.AUTH.REFRESH)
                .set('Cookie', cookieHeader(undefined, token))
                .set('Origin', env.appUrl);
            expect(next.status).toBe(204);
        }
        expect(new Set((await RefreshToken.find()).map((row) => row.familyId)).size).toBe(1);
    });

    it('revokes the whole family when a rotated token is presented again later', async () => {
        const user = await seedUser();
        const { refreshToken: first } = await sessionFor(user);

        const rotated = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, first))
            .set('Origin', env.appUrl);
        const second = setCookies(rotated.headers).refresh_token ?? '';
        // Well past the grace window.
        await RefreshToken.update(
            { revokedAt: Not(IsNull()) },
            { revokedAt: DateTime.utc().minus({ minutes: 5 }).toJSDate() },
        );

        // The old token, used again: somebody else has a copy.
        const reuse = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, first))
            .set('Origin', env.appUrl);
        expect(reuse.status).toBe(401);

        // And now even the legitimate successor is dead.
        const afterwards = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, second))
            .set('Origin', env.appUrl);
        expect(afterwards.status).toBe(401);
        expect(setCookies(afterwards.headers).refresh_token).toBe('');
    });

    it('refuses a missing or forged token', async () => {
        expect((await api.post(API_ENDPOINTS.AUTH.REFRESH)).status).toBe(401);

        const forged = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, 'not.a.jwt'))
            .set('Origin', env.appUrl);
        expect(forged.status).toBe(401);
    });
});

describe('POST /auth/logout', () => {
    it('revokes the refresh token and clears both cookies', async () => {
        const user = await seedUser();
        const { cookie, refreshToken } = await sessionFor(user);

        const response = await api
            .post(API_ENDPOINTS.AUTH.LOGOUT)
            .set('Cookie', cookie)
            .set('Origin', env.appUrl);

        expect(response.status).toBe(204);
        expect(setCookies(response.headers)).toEqual({ access_token: '', refresh_token: '' });

        const again = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, refreshToken))
            .set('Origin', env.appUrl);
        expect(again.status).toBe(401);
    });

    it('answers 204 without any session', async () => {
        expect((await api.post(API_ENDPOINTS.AUTH.LOGOUT)).status).toBe(204);
    });
});

describe('cross-site protection', () => {
    it('allows the app origin through CORS with credentials', async () => {
        const response = await api.get(API_ENDPOINTS.HEALTH).set('Origin', env.appUrl);

        expect(response.headers['access-control-allow-origin']).toBe(env.appUrl);
        expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('never reflects another origin', async () => {
        const response = await api.get(API_ENDPOINTS.HEALTH).set('Origin', 'https://evil.example');

        // A fixed allow-list value, not an echo of the request: the browser on
        // evil.example compares the two, finds no match, and refuses to read.
        expect(response.headers['access-control-allow-origin']).toBe(env.appUrl);
    });

    it('refuses a cookie-authenticated write from another origin', async () => {
        const user = await seedUser();
        const { cookie } = await sessionFor(user);

        const response = await api
            .post(API_ENDPOINTS.AUTH.LOGOUT)
            .set('Cookie', cookie)
            .set('Origin', 'https://evil.example');

        expect(response.status).toBe(403);
        expect(error(response).code).toBe(ERROR_CODES.FORBIDDEN);
    });

    it('accepts the Referer when a browser sends no Origin', async () => {
        const user = await seedUser();
        const { cookie } = await sessionFor(user);

        const response = await api
            .post(API_ENDPOINTS.AUTH.LOGOUT)
            .set('Cookie', cookie)
            .set('Referer', `${env.appUrl}/settings`);

        expect(response.status).toBe(204);
    });

    it('leaves bearer-authenticated and cookie-less requests alone', async () => {
        const response = await api
            .post(API_ENDPOINTS.AUTH.LOGOUT)
            .set('Origin', 'https://evil.example');

        expect(response.status).toBe(204);
    });
});
