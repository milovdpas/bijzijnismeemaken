import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';

import { env } from '../../config/app';
import RefreshToken from '../models/RefreshToken.entity';
import User from '../models/User.entity';
import JWT from '../utils/JWT';
import { hashToken } from '../utils/Token';

export interface IssuedSession {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export type RefreshProblem = 'INVALID' | 'EXPIRED' | 'REUSED';
export type RefreshResult =
    { ok: true; session: IssuedSession } | { ok: false; problem: RefreshProblem };

/**
 * Signed-in sessions: a short-lived access JWT and a refresh JWT backed by a
 * `refresh_tokens` row.
 *
 * The row is what makes a session endable. Logout revokes it, account deletion
 * removes it, and a reset revokes all of them; a bare JWT could do none of
 * that. Every refresh rotates: the presented token is revoked and a new one is
 * issued in the same family, so a token that is presented twice is one that
 * leaked, and the whole family goes with it.
 */
/** How long after a rotation the old token still refreshes: long enough for a second tab, short enough for a thief to be late. */
const ROTATION_GRACE_SECONDS = 30;

export class SessionService {
    /** A fresh family: a login, or a verification link. */
    static async issue(user: User, userAgent: string | null): Promise<IssuedSession> {
        return SessionService.mint(user, randomUUID(), userAgent);
    }

    static async refresh(refreshToken: string, userAgent: string | null): Promise<RefreshResult> {
        const claims = await JWT.verify(refreshToken, 'refresh');
        if (claims === null) {
            return { ok: false, problem: 'INVALID' };
        }

        const row = await RefreshToken.findOneBy({ id: claims.jti });
        if (row === null || row.tokenHash !== hashToken(refreshToken)) {
            return { ok: false, problem: 'INVALID' };
        }

        const now = DateTime.utc();
        const user = await User.findOneBy({ id: row.userId });
        if (user === null) {
            return { ok: false, problem: 'INVALID' };
        }
        if (row.revokedAt !== null) {
            // Just rotated and presented again within moments: two tabs that
            // refreshed together, the second one still holding the old token.
            // It gets its own pair in the same family; the first one keeps its.
            const grace = DateTime.fromJSDate(row.revokedAt).plus({
                seconds: ROTATION_GRACE_SECONDS,
            });
            if (row.replacedById !== null && now <= grace) {
                return {
                    ok: true,
                    session: await SessionService.mint(user, row.familyId, userAgent),
                };
            }
            // Rotated away a while ago, and presented again: somebody holds a
            // copy. Nothing issued from this login can be trusted any more.
            await SessionService.revokeFamily(row.familyId, now);
            return { ok: false, problem: 'REUSED' };
        }
        if (!row.isUsable(now)) {
            return { ok: false, problem: 'EXPIRED' };
        }

        const session = await SessionService.mint(user, row.familyId, userAgent);
        const next = await RefreshToken.findOneByOrFail({
            tokenHash: hashToken(session.refreshToken),
        });
        row.revokedAt = now.toJSDate();
        row.replacedById = next.id;
        await row.save();

        return { ok: true, session };
    }

    /** Logout. A token that is unknown or already revoked is simply ignored. */
    static async revoke(refreshToken: string): Promise<void> {
        const claims = await JWT.verify(refreshToken, 'refresh');
        if (claims === null) {
            return;
        }
        const row = await RefreshToken.findOneBy({ id: claims.jti });
        if (row !== null && row.revokedAt === null && row.tokenHash === hashToken(refreshToken)) {
            row.revokedAt = DateTime.utc().toJSDate();
            await row.save();
        }
    }

    /** Sign out everywhere: a password reset, an account deletion. */
    static async revokeAllForUser(userId: string): Promise<void> {
        await RefreshToken.createQueryBuilder()
            .update()
            .set({ revokedAt: DateTime.utc().toJSDate() })
            .where('user_id = :userId AND revoked_at IS NULL', { userId })
            .execute();
    }

    private static async revokeFamily(familyId: string, now: DateTime): Promise<void> {
        await RefreshToken.createQueryBuilder()
            .update()
            .set({ revokedAt: now.toJSDate() })
            .where('family_id = :familyId AND revoked_at IS NULL', { familyId })
            .execute();
    }

    private static async mint(
        user: User,
        familyId: string,
        userAgent: string | null,
    ): Promise<IssuedSession> {
        const now = DateTime.utc();
        const jti = randomUUID();
        const [accessToken, refreshToken] = await Promise.all([
            JWT.sign({ sub: user.id, type: 'access' }, env.auth.accessTtlSeconds),
            JWT.sign({ sub: user.id, type: 'refresh', jti }, env.auth.refreshTtlSeconds),
        ]);

        await RefreshToken.create({
            id: jti,
            userId: user.id,
            tokenHash: hashToken(refreshToken),
            familyId,
            expiresAt: now.plus({ seconds: env.auth.refreshTtlSeconds }).toJSDate(),
            revokedAt: null,
            replacedById: null,
            userAgent: userAgent === null ? null : userAgent.slice(0, 255),
        }).save();

        return { accessToken, refreshToken, user };
    }
}
