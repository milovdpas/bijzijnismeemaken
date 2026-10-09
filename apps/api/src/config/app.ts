import path from 'node:path';
import { config as loadEnvFile } from 'dotenv';

/**
 * Tests read `.env.test`, everything else reads `.env`.
 *
 * Vitest sets `NODE_ENV=test` before any of this is imported, so the choice is
 * made once and cannot be changed later by anything that runs afterwards.
 *
 * The path is resolved against this file rather than the working directory. A
 * relative path would load a different file depending on whether the command
 * was run from the repo root or from `apps/api`, and the failure mode is a test
 * run pointed at the development database.
 *
 * `tests/globalSetup.ts` refuses to run unless the resulting database name ends
 * in `_test`, which is the check that actually stops that happening.
 */
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
// Quiet, because dotenv v17 otherwise prints a banner with a tip on every
// start, which in the test runner and the worker client is just noise.
loadEnvFile({ path: path.resolve(__dirname, '../..', envFile), quiet: true });

/**
 * A value that has to be there, read lazily.
 *
 * Kept for the settings later tasks add (JWT secret, Google client, Brevo key):
 * calling it inside a function means a missing key only fails when the feature
 * is used, so an API that serves everything else is not refused at boot because
 * one integration is unconfigured.
 */
export function required(name: string): string {
    const value = process.env[name];
    if (value === undefined || value.trim() === '') {
        throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
    }
    return value;
}

function optional(name: string, fallback: string): string {
    const value = process.env[name];
    return value === undefined || value.trim() === '' ? fallback : value;
}

/**
 * A port, or a refusal to start.
 *
 * `Number()` turns anything unparseable into `NaN`, and `app.listen(NaN)` binds
 * a random free port without complaining. The deployment then looks healthy and
 * is unreachable, which is the same failure the production branch of
 * `listenOnFreePort` exists to prevent, arriving through a different door.
 */
function port(name: string, fallback: string): number {
    return integer(name, fallback, 1, 65535);
}

/**
 * A whole number in range, or a refusal to start.
 *
 * Every numeric setting goes through this, because the failure `Number()` gives
 * is silent in a different way each time. A bad `PORT` becomes `NaN` and
 * `app.listen(NaN)` picks a random free port. A bad `TRUST_PROXY_HOPS` becomes
 * `NaN` too, and Express compares `i < NaN`, which is false for every hop, so it
 * trusts nothing and every caller behind the proxy shares one rate-limit bucket.
 */
function integer(name: string, fallback: string, min: number, max: number): number {
    const raw = optional(name, fallback);
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(
            `${name} is "${raw}", which is not a whole number between ${String(min)} and ${String(max)}.`,
        );
    }
    return value;
}

/** Server configuration. Secrets live here and only here, never in apps/web. */
export const env = {
    nodeEnv: optional('NODE_ENV', 'development'),
    port: port('PORT', '4000'),

    database: {
        host: optional('DB_HOST', 'localhost'),
        port: port('DB_PORT', '3308'),
        user: optional('DB_USER', 'bzim'),
        password: optional('DB_PASSWORD', 'bzim'),
        name: optional('DB_NAME', 'bzim'),
    },

    /**
     * Shared secret for the worker endpoints, which the scheduler calls and the
     * web app never does.
     *
     * Not `required()`: reading it at startup would refuse to boot a deployment
     * that has not set it, and an API that serves the app is worth more than one
     * that refuses everything because its cron secret is missing. The routes
     * answer 503 instead, so the failure shows up in the scheduler's log.
     */
    workerToken: optional('WORKER_TOKEN', ''),

    /**
     * How many reverse proxies sit between a caller and this process.
     *
     * Read by `app.set('trust proxy', ...)`, which decides what `req.ip` is, and
     * the rate limiters key on that. One hop in production, where nginx owns
     * ingress; none in development, where nothing is in front. Wrong in either
     * direction has a real cost: too trusting and a caller picks their own
     * rate-limit key with a header, too suspicious and everybody shares the
     * proxy's address and one bucket.
     */
    trustProxyHops: integer(
        'TRUST_PROXY_HOPS',
        process.env.NODE_ENV === 'production' ? '1' : '0',
        0,
        // A chain longer than this is not a topology, it is a header somebody
        // wrote by hand.
        10,
    ),

    isProduction(): boolean {
        return this.nodeEnv === 'production';
    },
};
