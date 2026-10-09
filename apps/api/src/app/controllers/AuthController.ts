import type { Handler } from '../../interfaces/IHttp';
import { SessionService } from '../services/SessionService';
import { sendUnauthenticated } from '../utils/ApiResponses';
import { REFRESH_COOKIE, clearAuthCookies, cookieOf, setAuthCookies } from '../utils/Cookies';

/**
 * Session endpoints. Login itself (Google, email + password) arrives in task 8
 * and issues the same cookies through the same service.
 */
export default class AuthController {
    private readonly sessions = new SessionService();

    /**
     * Rotates the pair. Every failure clears both cookies: a browser holding a
     * refresh token that was refused has nothing left worth keeping, and
     * clearing it stops the client retrying a dead session.
     */
    refresh: Handler = async (req, res) => {
        const token = cookieOf(req, REFRESH_COOKIE);
        if (token === undefined) {
            sendUnauthenticated(res);
            return;
        }

        const result = await this.sessions.refresh(token, req.header('user-agent') ?? null);
        if (!result.ok) {
            clearAuthCookies(res);
            sendUnauthenticated(res);
            return;
        }

        setAuthCookies(res, result.session);
        res.status(204).end();
    };

    /** Idempotent: a missing or unknown cookie still answers 204 and clears. */
    logout: Handler = async (req, res) => {
        const token = cookieOf(req, REFRESH_COOKIE);
        if (token !== undefined) {
            await this.sessions.revoke(token);
        }
        clearAuthCookies(res);
        res.status(204).end();
    };
}
