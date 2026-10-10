import { OAuth2Client } from 'google-auth-library';
import { API_ENDPOINTS } from '@bzim/types';

import { env } from '../../../config/app';

/** What a Google login tells us about the person, and nothing more. */
export interface GoogleProfile {
    sub: string;
    email: string;
    emailVerified: boolean;
}

/**
 * The one place that talks to Google's OAuth endpoints for sign-in.
 *
 * Static, like every service and module here; tests `vi.spyOn(GoogleAuthModule, 'exchangeCode')`
 * and never reach the network. Calendar access (task 34) gets its own module
 * behind the calendar provider interface; this one is login only.
 */
export default class GoogleAuthModule {
    private static client(): OAuth2Client {
        return new OAuth2Client({
            clientId: env.google.clientId(),
            clientSecret: env.google.clientSecret(),
            redirectUri: `${env.apiUrl}${API_ENDPOINTS.AUTH.GOOGLE_CALLBACK}`,
        });
    }

    /** Where to send the browser. `state` is ours and comes back untouched. */
    static authUrl(state: string): string {
        return GoogleAuthModule.client().generateAuthUrl({
            scope: ['openid', 'email', 'profile'],
            state,
            // Let the person pick an account every time: a shared laptop should
            // not silently sign in as whoever used it last.
            prompt: 'select_account',
        });
    }

    /**
     * Trades the one-time code for tokens and reads the identity from the
     * verified ID token. Throws on any failure; the caller turns that into a
     * redirect back to the login page.
     */
    static async exchangeCode(code: string): Promise<GoogleProfile> {
        const client = GoogleAuthModule.client();
        const { tokens } = await client.getToken(code);
        if (tokens.id_token === undefined || tokens.id_token === null) {
            throw new Error('Google returned no id_token');
        }

        const ticket = await client.verifyIdToken({
            idToken: tokens.id_token,
            audience: env.google.clientId(),
        });
        const payload = ticket.getPayload();
        if (payload === undefined || payload.email === undefined) {
            throw new Error('Google id_token carries no email');
        }

        return {
            sub: payload.sub,
            email: payload.email,
            emailVerified: payload.email_verified === true,
        };
    }
}
