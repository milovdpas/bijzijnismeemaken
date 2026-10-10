import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { env } from '../../../config/app';
import type { MailMessage, Mailer } from './Mailer';

/**
 * Any SMTP server: the bundled mailpit (no auth, no TLS), a sandbox such as
 * Mailtrap (auth + STARTTLS), or a real relay. `SMTP_SECURE=true` is implicit
 * TLS on port 465; otherwise nodemailer upgrades with STARTTLS when the
 * server offers it, which is what port 587 and 2525 relays expect.
 */
export default class SmtpMailer implements Mailer {
    private readonly transport: Transporter = nodemailer.createTransport({
        host: env.mail.smtp.host,
        port: env.mail.smtp.port,
        secure: env.mail.smtp.secure,
        auth:
            env.mail.smtp.user === ''
                ? undefined
                : { user: env.mail.smtp.user, pass: env.mail.smtp.password },
    });

    async send(message: MailMessage): Promise<void> {
        await this.transport.sendMail({
            from: { name: env.mail.fromName, address: env.mail.fromEmail },
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html,
        });
    }
}
