import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, Daypart } from '@bzim/types';
import type { WorkerJobResponse } from '@bzim/types';

import ManualUnavailability from '../src/app/domain/models/ManualUnavailability.entity';
import OAuthState, { OAuthPurpose } from '../src/app/domain/models/OAuthState.entity';
import RefreshToken from '../src/app/domain/models/RefreshToken.entity';
import { env } from '../src/config/app';
import { asWorker, data } from './support/client';
import { seedBlock, seedUser } from './support/factories';

const daysAgo = (days: number) => DateTime.utc().minus({ days }).toJSDate();
const dateDaysAgo = (days: number) => DateTime.utc().minus({ days }).toISODate() ?? '';

async function token(user: { id: string }, fields: Partial<RefreshToken>): Promise<RefreshToken> {
    const row = RefreshToken.create();
    Object.assign(row, {
        userId: user.id,
        tokenHash: `hash-${Math.random().toString(36).slice(2)}`,
        familyId: 'family',
        expiresAt: daysAgo(-60),
        revokedAt: null,
        replacedById: null,
        userAgent: null,
        ...fields,
    });
    return row.save();
}

async function state(fields: Partial<OAuthState>): Promise<OAuthState> {
    const row = OAuthState.create();
    Object.assign(row, {
        state: `state-${Math.random().toString(36).slice(2)}`,
        purpose: OAuthPurpose.LOGIN,
        userId: null,
        returnTo: null,
        expiresAt: daysAgo(-1),
        ...fields,
    });
    return row.save();
}

describe('POST /worker/cleanup', () => {
    it('sweeps what nothing can reach any more and leaves the rest', async () => {
        const user = await seedUser();
        const longExpired = await token(user, { expiresAt: daysAgo(31) });
        const longRevoked = await token(user, { revokedAt: daysAgo(31) });
        const recentlyExpired = await token(user, { expiresAt: daysAgo(2) });
        const live = await token(user, {});
        const staleState = await state({
            expiresAt: DateTime.utc().minus({ hours: 2 }).toJSDate(),
        });
        const pendingState = await state({});
        const oldBlock = await seedBlock(user, dateDaysAgo(91), Daypart.MORNING);
        const recentBlock = await seedBlock(user, dateDaysAgo(10), Daypart.MORNING);
        const futureBlock = await seedBlock(user, dateDaysAgo(-10), Daypart.EVENING);

        const body = data<WorkerJobResponse>(
            await asWorker(env.workerToken).post(API_ENDPOINTS.WORKER.CLEANUP),
        );
        expect(body.stats).toEqual({ refreshTokens: 2, oauthStates: 1, manualBlocks: 1 });

        const tokensLeft = (await RefreshToken.find()).map((row) => row.id).sort();
        expect(tokensLeft).toEqual([recentlyExpired.id, live.id].sort());
        expect(await RefreshToken.existsBy({ id: longExpired.id })).toBe(false);
        expect(await RefreshToken.existsBy({ id: longRevoked.id })).toBe(false);
        expect(await OAuthState.existsBy({ id: staleState.id })).toBe(false);
        expect(await OAuthState.existsBy({ id: pendingState.id })).toBe(true);
        expect(await ManualUnavailability.existsBy({ id: oldBlock.id })).toBe(false);
        expect(await ManualUnavailability.existsBy({ id: recentBlock.id })).toBe(true);
        expect(await ManualUnavailability.existsBy({ id: futureBlock.id })).toBe(true);
    });
});
