import { DateTime } from 'luxon';
import { LessThan } from 'typeorm';
import { TIME_ZONE } from '@bzim/types';

import ManualUnavailability from '../models/ManualUnavailability.entity';
import OAuthState from '../models/OAuthState.entity';
import RefreshToken from '../models/RefreshToken.entity';

/** How long each kind of leftover is kept before the nightly sweep takes it (docs/02 §2.7). */
const KEEP = {
    /** Expired or revoked refresh tokens: a month, so a reuse of a revoked token is still detectable. */
    refreshTokenDays: 30,
    /** OAuth states live ten minutes; an hour after expiry nothing can still be waiting on one. */
    oauthStateHours: 1,
    /** One-off manual blocks in the past: a season, then they are noise. */
    manualBlockDays: 90,
} as const;

export interface CleanupStats extends Record<string, number> {
    refreshTokens: number;
    oauthStates: number;
    manualBlocks: number;
}

/**
 * The nightly sweep. Each step deletes rows nothing can reach any more,
 * and reports how many went so the scheduler's log shows the job working.
 * Synced calendar events join in M2 with the tables that hold them.
 */
export class CleanupService {
    static async run(): Promise<CleanupStats> {
        const now = DateTime.now().setZone(TIME_ZONE);
        const tokenCutoff = now.minus({ days: KEEP.refreshTokenDays }).toUTC().toJSDate();
        const stateCutoff = now.minus({ hours: KEEP.oauthStateHours }).toUTC().toJSDate();
        const blockCutoff = now.minus({ days: KEEP.manualBlockDays }).toISODate() ?? '';

        const [expiredTokens, revokedTokens, states, blocks] = await Promise.all([
            RefreshToken.delete({ expiresAt: LessThan(tokenCutoff) }),
            RefreshToken.delete({ revokedAt: LessThan(tokenCutoff) }),
            OAuthState.delete({ expiresAt: LessThan(stateCutoff) }),
            ManualUnavailability.delete({ date: LessThan(blockCutoff) }),
        ]);

        return {
            refreshTokens: (expiredTokens.affected ?? 0) + (revokedTokens.affected ?? 0),
            oauthStates: states.affected ?? 0,
            manualBlocks: blocks.affected ?? 0,
        };
    }
}
