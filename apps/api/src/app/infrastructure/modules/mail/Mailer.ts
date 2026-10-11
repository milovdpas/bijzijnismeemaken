/** One outgoing email. Both bodies are always present; clients pick. */
export interface MailMessage {
    to: string;
    subject: string;
    html: string;
    text: string;
}

/**
 * How email leaves the API. Implementations: `ConsoleMailer` (log only),
 * `SmtpMailer` (a local catcher such as mailpit), `BrevoMailer` (production).
 *
 * Services never pick an implementation; they import `mailer` from
 * `infrastructure/modules/mail` and the environment decides. Tests spy on that one object.
 */
export interface Mailer {
    send(message: MailMessage): Promise<void>;
}
