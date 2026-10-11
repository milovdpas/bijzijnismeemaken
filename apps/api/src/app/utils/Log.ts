/**
 * What may go into a log line. Logging is plain `console` with a prefix that
 * names the place ("Calendar connect failed:"); these keep the personal and
 * secret parts out of it, since a month of logs is read by whoever is
 * debugging, not by the people the lines are about.
 */

/** `m***@example.com`: enough to recognise, not enough to address. */
export function maskEmail(email: string): string {
    const at = email.indexOf('@');
    if (at <= 0) return '***';
    return `${email.charAt(0)}***${email.slice(at)}`;
}

/** The push service and the start of the path; the rest of a push endpoint is a capability token. */
export function shortEndpoint(endpoint: string): string {
    try {
        const url = new URL(endpoint);
        return `${url.host}${url.pathname.slice(0, 12)}...`;
    } catch {
        return `${endpoint.slice(0, 24)}...`;
    }
}
