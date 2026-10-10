import { DateTime } from 'luxon';
import { AUTH } from '@bzim/types';

import EmailToken, { EmailTokenPurpose } from '../models/EmailToken.entity';
import type User from '../models/User.entity';
import { generateToken, hashToken } from '../utils/Token';

const LIFETIME: Record<EmailTokenPurpose, { hours?: number; minutes?: number }> = {
    [EmailTokenPurpose.VERIFY_EMAIL]: { hours: AUTH.VERIFY_EMAIL_HOURS },
    [EmailTokenPurpose.RESET_PASSWORD]: { minutes: AUTH.RESET_PASSWORD_MINUTES },
};

/**
 * One-time links. The value goes into the email, the hash into the row.
 *
 * Issuing a new token spends every older unused one of the same purpose for
 * that user, so only the most recent email works: a person who asks twice
 * cannot be caught out by clicking the first.
 */
export class EmailTokenService {
    static async issue(user: User, purpose: EmailTokenPurpose): Promise<string> {
        const now = DateTime.utc();
        await EmailToken.createQueryBuilder()
            .update()
            .set({ usedAt: now.toJSDate() })
            .where('user_id = :userId AND purpose = :purpose AND used_at IS NULL', {
                userId: user.id,
                purpose,
            })
            .execute();

        const value = generateToken();
        await EmailToken.create({
            userId: user.id,
            purpose,
            tokenHash: hashToken(value),
            expiresAt: now.plus(LIFETIME[purpose]).toJSDate(),
            usedAt: null,
        }).save();
        return value;
    }

    /** The owning user id if the token is live, spending it; null otherwise. */
    static async consume(value: string, purpose: EmailTokenPurpose): Promise<string | null> {
        const row = await EmailToken.findOneBy({ tokenHash: hashToken(value), purpose });
        const now = DateTime.utc();
        if (row === null || !row.isUsable(now)) {
            return null;
        }
        row.usedAt = now.toJSDate();
        await row.save();
        return row.userId;
    }
}
