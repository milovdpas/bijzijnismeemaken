import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { env } from '../../../config/app';
import type { MailMessage, Mailer } from './Mailer';

/**
 * Plain SMTP, for the bundled mailpit in development. No authentication and no
 * TLS, because the only host it is ever pointed at is localhost. Production
 * uses Brevo's HTTP API instead.
 */
export default class SmtpMailer implements Mailer {
    private readonly transport: Transporter = nodemailer.createTransport({
        host: env.mail.smtp.host,
        port: env.mail.smtp.port,
        secure: false,
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
