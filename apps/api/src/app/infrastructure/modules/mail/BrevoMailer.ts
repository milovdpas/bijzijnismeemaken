import { env } from '../../../../config/app';
import type { MailMessage, Mailer } from './Mailer';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Brevo's transactional endpoint over plain `fetch`. One request, one message;
 * the SDK would add a dependency for the same four fields.
 */
export default class BrevoMailer implements Mailer {
    async send(message: MailMessage): Promise<void> {
        const response = await fetch(BREVO_URL, {
            method: 'POST',
            headers: {
                'api-key': env.mail.brevoApiKey(),
                'content-type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify({
                sender: { name: env.mail.fromName, email: env.mail.fromEmail },
                to: [{ email: message.to }],
                subject: message.subject,
                htmlContent: message.html,
                textContent: message.text,
            }),
        });

        if (!response.ok) {
            // The body names the reason (unauthenticated sender, bad key) and
            // never contains the message, so it is safe to log.
            throw new Error(`Brevo answered ${String(response.status)}: ${await response.text()}`);
        }
    }
}
