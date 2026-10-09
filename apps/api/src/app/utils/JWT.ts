import jwt from 'jsonwebtoken';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';

import { env } from '../../config/app';

/**
 * The two token kinds, told apart by `type` so a refresh token can never be
 * presented as an access token or the other way round.
 *
 * `sub` is the user id. A refresh token also carries `jti`, which is the id of
 * its `refresh_tokens` row, so the database side of the session can be found
 * without a scan.
 */
export interface AccessClaims {
    sub: string;
    type: 'access';
}

export interface RefreshClaims {
    sub: string;
    type: 'refresh';
    jti: string;
}

type Claims = AccessClaims | RefreshClaims;

/** Thin promise wrappers over jsonwebtoken, as in carrefour, with typed claims. */
export default class JWT {
    static sign(claims: Claims, expiresInSeconds: number): Promise<string> {
        const { type, sub } = claims;
        const options: SignOptions = { expiresIn: expiresInSeconds, subject: sub };
        if (claims.type === 'refresh') {
            options.jwtid = claims.jti;
        }

        return new Promise((resolve, reject) => {
            jwt.sign({ type }, env.jwtSecret(), options, (error, token) => {
                if (error !== null || token === undefined) {
                    reject(error ?? new Error('jsonwebtoken returned no token'));
                } else {
                    resolve(token);
                }
            });
        });
    }

    /**
     * The claims of a valid token, or null.
     *
     * Null rather than a throw for every reason a token can be bad (expired,
     * tampered, wrong type, not even a JWT): to the caller these are all one
     * outcome, "not signed in", and none of them is a fault in our code.
     */
    static async verify<T extends Claims['type']>(
        token: string,
        type: T,
    ): Promise<Extract<Claims, { type: T }> | null> {
        const decoded = await new Promise<JwtPayload | null>((resolve) => {
            jwt.verify(token, env.jwtSecret(), { algorithms: ['HS256'] }, (error, payload) => {
                resolve(error === null && typeof payload === 'object' ? payload : null);
            });
        });

        if (decoded === null || decoded.type !== type || typeof decoded.sub !== 'string') {
            return null;
        }
        if (type === 'refresh' && typeof decoded.jti !== 'string') {
            return null;
        }
        return { sub: decoded.sub, type, jti: decoded.jti } as Extract<Claims, { type: T }>;
    }
}
