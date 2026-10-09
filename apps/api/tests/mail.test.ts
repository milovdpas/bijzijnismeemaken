import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@bzim/types';

import { env } from '../src/config/app';
import BrevoMailer from '../src/app/modules/mail/BrevoMailer';
import { renderResetPassword, renderVerifyEmail } from '../src/app/modules/mail/templates';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('templates', () => {
    it('render both bodies with the link and escape what they interpolate', () => {
        const message = renderVerifyEmail(
            Locale.EN,
            'a@example.com',
            'https://app/verify?token=a&b',
        );

        expect(message.subject).toBe('Confirm your email address');
        expect(message.text).toContain('https://app/verify?token=a&b');
        expect(message.html).toContain('href="https://app/verify?token=a&amp;b"');
        expect(message.html).toContain('24 hours');
    });

    it('fill the expiry for a reset in Dutch', () => {
        const message = renderResetPassword(
            Locale.NL,
            'a@example.com',
            'https://app/reset?token=x',
        );

        expect(message.subject).toBe('Nieuw wachtwoord instellen');
        expect(message.text).toContain('60 minuten');
    });
});

describe('BrevoMailer', () => {
    it('posts the message with the api key and the configured sender', async () => {
        process.env.BREVO_API_KEY = 'brevo-key';
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response('{"messageId":"1"}', { status: 201 }));

        await new BrevoMailer().send({
            to: 'a@example.com',
            subject: 'Hi',
            html: '<p>x</p>',
            text: 'x',
        });

        const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.brevo.com/v3/smtp/email');
        expect((init.headers as Record<string, string>)['api-key']).toBe('brevo-key');
        const body = JSON.parse(init.body as string) as {
            sender: { email: string };
            to: { email: string }[];
        };
        expect(body.sender.email).toBe(env.mail.fromEmail);
        expect(body.to).toEqual([{ email: 'a@example.com' }]);
    });

    it('throws on a non-2xx answer so the caller can log it', async () => {
        process.env.BREVO_API_KEY = 'brevo-key';
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('unauthorised', { status: 401 }),
        );

        await expect(
            new BrevoMailer().send({ to: 'a@example.com', subject: 'Hi', html: '', text: '' }),
        ).rejects.toThrow(/401/);
    });
});
