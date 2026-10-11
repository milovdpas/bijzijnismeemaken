import { env } from '../../../config/app';
import { maskEmail } from '../../utils/Log';
import BrevoMailer from './BrevoMailer';
import ConsoleMailer from './ConsoleMailer';
import type { MailMessage, Mailer } from './Mailer';
import SmtpMailer from './SmtpMailer';

function createMailer(): Mailer {
    switch (env.mail.driver) {
        case 'brevo':
            return new BrevoMailer();
        case 'smtp':
            return new SmtpMailer();
        case 'console':
            return new ConsoleMailer();
    }
}

/**
 * The one mailer, chosen by `MAIL_DRIVER`. Services import this; tests
 * `vi.spyOn(mailer, 'send')` to read what would have gone out.
 */
export const mailer: Mailer = createMailer();

/**
 * Sends and swallows. Mail failures are logged, never thrown: the row the
 * email is about already exists, and failing the request would tell the
 * person their action did not happen when it did. Everything that emails
 * goes through here, so the policy exists once.
 */
export async function deliver(message: MailMessage): Promise<void> {
    try {
        await mailer.send(message);
    } catch (error) {
        console.error(`Could not send "${message.subject}" to ${maskEmail(message.to)}:`, error);
    }
}

export type { MailMessage, Mailer } from './Mailer';
