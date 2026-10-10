import type User from '../../src/app/models/User.entity';
import { SessionService } from '../../src/app/services/SessionService';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../src/app/utils/Cookies';

export interface TestSession {
    accessToken: string;
    refreshToken: string;
    /** The `Cookie` header a browser would send with both tokens. */
    cookie: string;
}

/**
 * A signed-in session for a seeded user, minted through the real service so
 * the tokens and the `refresh_tokens` row are exactly what a login produces.
 */
export async function sessionFor(user: User): Promise<TestSession> {
    const session = await SessionService.issue(user, 'vitest');
    return {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        cookie: cookieHeader(session.accessToken, session.refreshToken),
    };
}

export function cookieHeader(accessToken?: string, refreshToken?: string): string {
    const parts: string[] = [];
    if (accessToken !== undefined) parts.push(`${ACCESS_COOKIE}=${accessToken}`);
    if (refreshToken !== undefined) parts.push(`${REFRESH_COOKIE}=${refreshToken}`);
    return parts.join('; ');
}

/** The `Set-Cookie` lines of a response, keyed by cookie name. */
export function setCookies(headers: Record<string, unknown>): Record<string, string> {
    const raw = headers['set-cookie'];
    const lines = Array.isArray(raw) ? (raw as string[]) : typeof raw === 'string' ? [raw] : [];
    const result: Record<string, string> = {};
    for (const line of lines) {
        const [pair] = line.split(';');
        const [name, value] = (pair ?? '').split('=');
        if (name !== undefined) result[name] = value ?? '';
    }
    return result;
}
