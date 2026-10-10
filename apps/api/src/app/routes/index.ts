import { DateTime } from 'luxon';
import type { Router } from 'express';
import { API_ENDPOINTS } from '@bzim/types';
import type { HealthResponse } from '@bzim/types';

import { AppDataSource } from '../../database/typeorm-db';
import Api from './api';

/** Long for a `SELECT 1`, short against any sensible probe interval. */
const HEALTH_QUERY_TIMEOUT_MS = 2000;

export default (router: Router): void => {
    /**
     * Health check, outside authentication because a probe has no token.
     *
     * The database is reported separately rather than folded into one boolean.
     * A process that is up but cannot reach MySQL is exactly the state where
     * nothing works, and "ok" would hide it.
     *
     * It is **asked**, not assumed. Reading `isInitialized` would be set once at
     * startup and stay true for the rest of the process however dead the
     * connection becomes, so the one state the check exists to catch would be
     * the one state it could not report.
     */
    router.get(API_ENDPOINTS.HEALTH, async (_req, res) => {
        const database = await databaseReachable();
        const body: HealthResponse = {
            status: database ? 'ok' : 'degraded',
            database,
            uptime: process.uptime(),
            timestamp: DateTime.utc().toISO(),
        };
        res.status(database ? 200 : 503).json(body);
    });

    router.use(new Api().getRoutes());
};

/**
 * Whether MySQL answers, right now.
 *
 * Bounded, because an unreachable database usually means a request that hangs
 * rather than one that fails, and a health check that hangs reads as healthy to
 * a load balancer waiting on it. Two seconds is far longer than a `SELECT 1` on
 * a live pool and far shorter than any sensible probe interval.
 */
async function databaseReachable(): Promise<boolean> {
    if (!AppDataSource.isInitialized) {
        return false;
    }

    try {
        await Promise.race([
            AppDataSource.query('SELECT 1'),
            new Promise((_resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('Health check timed out'));
                }, HEALTH_QUERY_TIMEOUT_MS).unref();
            }),
        ]);
        return true;
    } catch (error) {
        console.error('Health check could not reach the database:', error);
        return false;
    }
}
