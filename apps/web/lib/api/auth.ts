import { API_ENDPOINTS } from '@bzim/types';
import type { Locale } from '@bzim/types';

import { buildUrl, request } from './client';

/** A full navigation: the API redirects the browser to Google and back. */
export function googleLoginUrl(returnTo?: string): string {
    return buildUrl(API_ENDPOINTS.AUTH.GOOGLE, { returnTo });
}

export function login(email: string, password: string): Promise<void> {
    return request<void>(API_ENDPOINTS.AUTH.LOGIN, { method: 'POST', body: { email, password } });
}

export function register(email: string, password: string, locale: Locale): Promise<void> {
    return request<void>(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        body: { email, password, locale },
    });
}

export function logout(): Promise<void> {
    return request<void>(API_ENDPOINTS.AUTH.LOGOUT, { method: 'POST' });
}

export function verifyEmail(token: string): Promise<void> {
    return request<void>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { method: 'POST', body: { token } });
}

export function resendVerification(email: string): Promise<void> {
    return request<void>(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, {
        method: 'POST',
        body: { email },
    });
}

export function forgotPassword(email: string): Promise<void> {
    return request<void>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { method: 'POST', body: { email } });
}

export function resetPassword(token: string, password: string): Promise<void> {
    return request<void>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        method: 'POST',
        body: { token, password },
    });
}
