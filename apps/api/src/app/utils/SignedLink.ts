import Crypt from './Crypt';

/**
 * Tokens for links that work without a session: the "add to calendar"
 * button in an email opens a calendar app, which has no cookie.
 *
 * A keyed MAC over the occurrence id. The id is a UUID already, but a MAC
 * means a leaked id alone shows nobody the where and when. It does not
 * expire: the occurrence can be re-dated after the email went out, and the
 * link should still fetch the current version.
 */
export function signOccurrenceToken(occurrenceId: string): string {
    return Crypt.hash(`ics:${occurrenceId}`);
}

export function verifyOccurrenceToken(occurrenceId: string, token: string): boolean {
    return Crypt.secureCompare(signOccurrenceToken(occurrenceId), token);
}
