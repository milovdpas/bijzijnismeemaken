import type { NextFunction, Request, Response } from 'express';

import User from '../models/User.entity';
import { sendUnauthenticated } from '../utils/ApiResponses';
import { ACCESS_COOKIE, cookieOf } from '../utils/Cookies';
import JWT from '../utils/JWT';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            /** Set by {@link userAuth}. Absent on routes that do not use it. */
            user: User;
        }
    }
}

/**
 * Who is calling.
 *
 * Browsers send the access token as a cookie. Tools and tests send it as a
 * bearer header, which is accepted too so neither has to juggle a cookie jar.
 * The header wins when both are present, because a tool that sets it means it.
 *
 * The user row is loaded on every request rather than trusted from the token:
 * a deleted account is signed out at most fifteen minutes after the fact
 * anyway, and this makes it immediate for everything the row is read for.
 */
export async function userAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = bearerOf(req) ?? cookieOf(req, ACCESS_COOKIE);
    if (token === undefined) {
        sendUnauthenticated(res);
        return;
    }

    const claims = await JWT.verify(token, 'access');
    if (claims === null) {
        sendUnauthenticated(res);
        return;
    }

    const user = await User.findOneBy({ id: claims.sub });
    if (user === null) {
        sendUnauthenticated(res);
        return;
    }

    req.user = user;
    next();
}

export function bearerOf(req: Request): string | undefined {
    const header = req.header('authorization');
    if (header === undefined || !header.startsWith('Bearer ')) {
        return undefined;
    }
    const token = header.slice('Bearer '.length).trim();
    return token === '' ? undefined : token;
}
