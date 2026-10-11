import type { CookieOptions, Request, Response } from 'express';

import { env } from '../../../config/app';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
/** The Google login's state, so only the browser that started the login can finish it. */
export const OAUTH_COOKIE = 'oauth_state';
const OAUTH_COOKIE_MINUTES = 10;

/**
 * Both tokens travel as httpOnly cookies, so no script in the browser can read
 * them. `SameSite=Lax` sends them on top-level navigations and same-site
 * requests, which is what the app on its sibling hostname needs, and keeps
 * them off cross-site POSTs. `Domain` is normally absent (host-only on the API
 * hostname, locally and in production); `COOKIE_DOMAIN` exists for a setup
 * where the two hostnames share a parent that belongs to this app alone.
 */
function baseOptions(): CookieOptions {
    return {
        httpOnly: true,
        secure: env.isProduction(),
        sameSite: 'lax',
        path: '/',
        domain: env.cookieDomain === '' ? undefined : env.cookieDomain,
    };
}

export function setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
): void {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
        ...baseOptions(),
        maxAge: env.auth.accessTtlSeconds * 1000,
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
        ...baseOptions(),
        maxAge: env.auth.refreshTtlSeconds * 1000,
    });
}

/** The same attributes as when they were set, or the browser keeps them. */
export function clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, baseOptions());
    res.clearCookie(REFRESH_COOKIE, baseOptions());
}

export function setOAuthCookie(res: Response, state: string): void {
    res.cookie(OAUTH_COOKIE, state, { ...baseOptions(), maxAge: OAUTH_COOKIE_MINUTES * 60 * 1000 });
}

export function clearOAuthCookie(res: Response): void {
    res.clearCookie(OAUTH_COOKIE, baseOptions());
}

/** A cookie value, as cookie-parser left it. */
export function cookieOf(req: Request, name: string): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[name];
}
