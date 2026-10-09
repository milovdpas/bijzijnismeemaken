import { env } from '../../../config/app';
import BrevoMailer from './BrevoMailer';
import ConsoleMailer from './ConsoleMailer';
import type { Mailer } from './Mailer';
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

export type { MailMessage, Mailer } from './Mailer';
