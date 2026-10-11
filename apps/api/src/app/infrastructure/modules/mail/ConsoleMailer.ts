import { maskEmail } from '../../utils/Log';
import type { MailMessage, Mailer } from './Mailer';

/**
 * Prints the message instead of sending it. The text body, not the HTML, so a
 * verification link can be copied straight out of the terminal.
 */
export default class ConsoleMailer implements Mailer {
    send(message: MailMessage): Promise<void> {
        console.log(
            `[mail] to=${maskEmail(message.to)} subject=${JSON.stringify(message.subject)}\n${message.text}`,
        );
        return Promise.resolve();
    }
}
