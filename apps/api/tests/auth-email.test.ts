import { DateTime } from 'luxon';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES } from '@bzim/types';

import { env } from '../src/config/app';
import EmailToken, { EmailTokenPurpose } from '../src/app/models/EmailToken.entity';
import User from '../src/app/models/User.entity';
import { mailer } from '../src/app/modules/mail';
import type { MailMessage } from '../src/app/modules/mail';
import { hashPassword, verifyPassword } from '../src/app/utils/Password';
import { cookieHeader, sessionFor, setCookies } from './support/auth';
import { api, error } from './support/client';
import { seedUser } from './support/factories';

const PASSWORD = 'correct horse battery';

/** Captures what would have been sent; nothing leaves the process. */
function outbox(): MailMessage[] {
    const sent: MailMessage[] = [];
    vi.spyOn(mailer, 'send').mockImplementation((message) => {
        sent.push(message);
        return Promise.resolve();
    });
    return sent;
}

/** The token inside the one link an email carries. */
function tokenIn(message: MailMessage, page: string): string {
    const match = new RegExp(`${env.appUrl}/${page}\\?token=([^\\s"<]+)`).exec(message.text);
    expect(match).not.toBeNull();
    return decodeURIComponent(match?.[1] ?? '');
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('registration email', () => {
    it('sends a verification link in the chosen language', async () => {
        const sent = outbox();

        await api
            .post(API_ENDPOINTS.AUTH.REGISTER)
            .send({ email: 'new@example.com', password: PASSWORD, locale: 'en' });

        expect(sent).toHaveLength(1);
        expect(sent[0]?.to).toBe('new@example.com');
        expect(sent[0]?.subject).toBe('Confirm your email address');
        expect(sent[0]?.html).toContain('Confirm email');
        expect(tokenIn(sent[0] as MailMessage, 'verify-email')).toHaveLength(43);
    });

    it('defaults to Dutch', async () => {
        const sent = outbox();

        await api
            .post(API_ENDPOINTS.AUTH.REGISTER)
            .send({ email: 'nl@example.com', password: PASSWORD });

        expect(sent[0]?.subject).toBe('Bevestig je e-mailadres');
    });

    it('still registers when the mail provider fails', async () => {
        vi.spyOn(mailer, 'send').mockRejectedValue(new Error('Brevo answered 401'));

        const response = await api
            .post(API_ENDPOINTS.AUTH.REGISTER)
            .send({ email: 'unlucky@example.com', password: PASSWORD });

        expect(response.status).toBe(201);
        expect(await User.findByEmail('unlucky@example.com')).not.toBeNull();
    });
});

describe('POST /auth/verify-email', () => {
    it('verifies the address, signs the person in, and spends the token', async () => {
        const sent = outbox();
        await api
            .post(API_ENDPOINTS.AUTH.REGISTER)
            .send({ email: 'v@example.com', password: PASSWORD });
        const token = tokenIn(sent[0] as MailMessage, 'verify-email');

        const response = await api.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL).send({ token });

        expect(response.status).toBe(204);
        expect(setCookies(response.headers).access_token).toBeTruthy();
        const user = await User.findByEmail('v@example.com');
        expect(user?.emailVerified()).toBe(true);

        const again = await api.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL).send({ token });
        expect(again.status).toBe(400);
        expect(error(again).code).toBe(ERROR_CODES.TOKEN_INVALID);

        // And the account can now sign in with its password.
        const login = await api
            .post(API_ENDPOINTS.AUTH.LOGIN)
            .send({ email: 'v@example.com', password: PASSWORD });
        expect(login.status).toBe(204);
    });

    it('refuses an unknown or expired token', async () => {
        const user = await seedUser({ emailVerifiedAt: null, googleSub: null });
        await EmailToken.create({
            userId: user.id,
            purpose: EmailTokenPurpose.VERIFY_EMAIL,
            tokenHash: 'a'.repeat(64),
            expiresAt: DateTime.utc().minus({ minutes: 1 }).toJSDate(),
            usedAt: null,
        }).save();

        const unknown = await api
            .post(API_ENDPOINTS.AUTH.VERIFY_EMAIL)
            .send({ token: 'x'.repeat(43) });
        expect(unknown.status).toBe(400);
        expect((await User.findOneByOrFail({ id: user.id })).emailVerified()).toBe(false);
    });
});

describe('POST /auth/resend-verification', () => {
    it('sends a fresh link and retires the old one', async () => {
        const sent = outbox();
        await api
            .post(API_ENDPOINTS.AUTH.REGISTER)
            .send({ email: 'r@example.com', password: PASSWORD });
        const first = tokenIn(sent[0] as MailMessage, 'verify-email');

        const response = await api
            .post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION)
            .send({ email: 'R@example.com' });

        expect(response.status).toBe(204);
        expect(sent).toHaveLength(2);
        const second = tokenIn(sent[1] as MailMessage, 'verify-email');
        expect(second).not.toBe(first);

        expect(
            (await api.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL).send({ token: first })).status,
        ).toBe(400);
        expect(
            (await api.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL).send({ token: second })).status,
        ).toBe(204);
    });

    it('is silent for unknown, verified and Google-only addresses', async () => {
        const sent = outbox();
        const verified = await seedUser({
            googleSub: null,
            passwordHash: await hashPassword(PASSWORD),
        });
        const google = await seedUser();

        for (const email of ['nobody@example.com', verified.email, google.email]) {
            const response = await api.post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION).send({ email });
            expect(response.status).toBe(204);
        }
        expect(sent).toHaveLength(0);
    });
});

describe('password reset', () => {
    it('emails a link, sets the new password, and signs out every session', async () => {
        const sent = outbox();
        const user = await seedUser({
            googleSub: null,
            email: 'reset@example.com',
            passwordHash: await hashPassword(PASSWORD),
        });
        const { refreshToken } = await sessionFor(user);

        const asked = await api
            .post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD)
            .send({ email: 'reset@example.com' });
        expect(asked.status).toBe(204);
        expect(sent[0]?.subject).toBe('Nieuw wachtwoord instellen');
        const token = tokenIn(sent[0] as MailMessage, 'reset-password');

        const reset = await api
            .post(API_ENDPOINTS.AUTH.RESET_PASSWORD)
            .send({ token, password: 'a brand new passphrase' });
        expect(reset.status).toBe(204);

        const fresh = await User.findOneByOrFail({ id: user.id });
        expect(await verifyPassword('a brand new passphrase', fresh.passwordHash ?? '')).toBe(true);
        expect(await verifyPassword(PASSWORD, fresh.passwordHash ?? '')).toBe(false);

        const refresh = await api
            .post(API_ENDPOINTS.AUTH.REFRESH)
            .set('Cookie', cookieHeader(undefined, refreshToken))
            .set('Origin', env.appUrl);
        expect(refresh.status).toBe(401);

        const reused = await api
            .post(API_ENDPOINTS.AUTH.RESET_PASSWORD)
            .send({ token, password: 'yet another passphrase' });
        expect(reused.status).toBe(400);
    });

    it('lets a Google-only account add a password, and verifies an unverified one', async () => {
        const sent = outbox();
        const google = await seedUser({ passwordHash: null });
        const pending = await seedUser({
            googleSub: null,
            passwordHash: await hashPassword(PASSWORD),
            emailVerifiedAt: null,
        });

        for (const user of [google, pending]) {
            await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD).send({ email: user.email });
        }
        expect(sent).toHaveLength(2);

        for (const [index, user] of [google, pending].entries()) {
            const token = tokenIn(sent[index] as MailMessage, 'reset-password');
            const reset = await api
                .post(API_ENDPOINTS.AUTH.RESET_PASSWORD)
                .send({ token, password: 'a brand new passphrase' });
            expect(reset.status).toBe(204);

            const login = await api
                .post(API_ENDPOINTS.AUTH.LOGIN)
                .send({ email: user.email, password: 'a brand new passphrase' });
            expect(login.status).toBe(204);
        }
    });

    it('is silent for an unknown address and refuses a weak new password', async () => {
        const sent = outbox();

        const asked = await api
            .post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD)
            .send({ email: 'nobody@example.com' });
        expect(asked.status).toBe(204);
        expect(sent).toHaveLength(0);

        const weak = await api
            .post(API_ENDPOINTS.AUTH.RESET_PASSWORD)
            .send({ token: 'x'.repeat(43), password: 'short' });
        expect(weak.status).toBe(422);
    });
});
