import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES } from '@bzim/types';

import User from '../src/app/domain/models/User.entity';
import { hashPassword, verifyPassword } from '../src/app/infrastructure/utils/Password';
import { setCookies } from './support/auth';
import { api, error } from './support/client';
import { seedUser } from './support/factories';

const PASSWORD = 'correct horse battery';

async function verifiedAccount(email = 'ann@example.com'): Promise<User> {
    return seedUser({
        googleSub: null,
        email,
        passwordHash: await hashPassword(PASSWORD),
        emailVerifiedAt: DateTime.utc().toJSDate(),
    });
}

describe('password hashing', () => {
    it('round-trips and salts every hash differently', async () => {
        const a = await hashPassword(PASSWORD);
        const b = await hashPassword(PASSWORD);

        expect(a).not.toBe(b);
        expect(a.startsWith('scrypt$32768$8$1$')).toBe(true);
        expect(await verifyPassword(PASSWORD, a)).toBe(true);
        expect(await verifyPassword('wrong', a)).toBe(false);
    });

    it('treats a malformed stored value as no match', async () => {
        expect(await verifyPassword(PASSWORD, 'garbage')).toBe(false);
        expect(await verifyPassword(PASSWORD, '')).toBe(false);
    });
});

describe('POST /auth/register', () => {
    it('creates an unverified account and issues no session', async () => {
        const response = await api
            .post(API_ENDPOINTS.AUTH.REGISTER)
            .send({ email: 'New@Example.com', password: PASSWORD, locale: 'en' });

        expect(response.status).toBe(201);
        expect(setCookies(response.headers)).toEqual({});

        const user = await User.findByEmail('New@Example.com');
        expect(user).not.toBeNull();
        expect(user?.email).toBe('new@example.com');
        expect(user?.emailVerified()).toBe(false);
        expect(user?.googleSub).toBeNull();
        expect(user?.locale).toBe('en');
        expect(await verifyPassword(PASSWORD, user?.passwordHash ?? '')).toBe(true);
    });

    it('refuses an email that already has an account', async () => {
        const existing = await seedUser();

        const response = await api
            .post(API_ENDPOINTS.AUTH.REGISTER)
            .send({ email: existing.email.toUpperCase(), password: PASSWORD });

        expect(response.status).toBe(409);
        expect(error(response).code).toBe(ERROR_CODES.CONFLICT);
    });

    it('refuses a short password and a bad email', async () => {
        const short = await api
            .post(API_ENDPOINTS.AUTH.REGISTER)
            .send({ email: 'a@example.com', password: 'short' });
        expect(short.status).toBe(422);

        const bad = await api
            .post(API_ENDPOINTS.AUTH.REGISTER)
            .send({ email: 'not-an-email', password: PASSWORD });
        expect(bad.status).toBe(422);
    });
});

describe('POST /auth/login', () => {
    it('signs in a verified account with both cookies', async () => {
        const user = await verifiedAccount();

        const response = await api
            .post(API_ENDPOINTS.AUTH.LOGIN)
            .send({ email: 'ANN@example.com', password: PASSWORD });

        expect(response.status).toBe(204);
        const cookies = setCookies(response.headers);
        expect(cookies.access_token).toBeTruthy();
        expect(cookies.refresh_token).toBeTruthy();
        expect((await User.findOneByOrFail({ id: user.id })).lastLoginAt).not.toBeNull();
    });

    it('answers the same for a wrong password and an unknown email', async () => {
        await verifiedAccount();

        const wrong = await api
            .post(API_ENDPOINTS.AUTH.LOGIN)
            .send({ email: 'ann@example.com', password: 'not it' });
        const unknown = await api
            .post(API_ENDPOINTS.AUTH.LOGIN)
            .send({ email: 'nobody@example.com', password: PASSWORD });

        expect(wrong.status).toBe(401);
        expect(unknown.status).toBe(401);
        expect(error(wrong).code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
        expect(error(unknown).code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    });

    it('refuses a Google-only account with a password', async () => {
        const user = await seedUser({ passwordHash: null });

        const response = await api
            .post(API_ENDPOINTS.AUTH.LOGIN)
            .send({ email: user.email, password: PASSWORD });

        expect(response.status).toBe(401);
        expect(error(response).code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    });

    it('refuses an account whose address is not verified yet', async () => {
        await seedUser({
            googleSub: null,
            email: 'pending@example.com',
            passwordHash: await hashPassword(PASSWORD),
            emailVerifiedAt: null,
        });

        const response = await api
            .post(API_ENDPOINTS.AUTH.LOGIN)
            .send({ email: 'pending@example.com', password: PASSWORD });

        expect(response.status).toBe(401);
        expect(error(response).code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
        expect(setCookies(response.headers)).toEqual({});
    });

    it('rate limits guesses against one email', async () => {
        await verifiedAccount();

        let last = 0;
        for (let i = 0; i < 9; i += 1) {
            const response = await api
                .post(API_ENDPOINTS.AUTH.LOGIN)
                .send({ email: 'ann@example.com', password: `guess ${String(i)}` });
            last = response.status;
        }

        expect(last).toBe(429);
    });
});
