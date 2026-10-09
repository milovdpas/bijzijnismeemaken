import { afterEach, describe, expect, it } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES } from '@bzim/types';
import type { WorkerJobResponse } from '@bzim/types';

import { env } from '../src/config/app';
import { api, asWorker, data, error } from './support/client';

const TOKEN = env.workerToken;

describe('worker endpoints', () => {
    afterEach(() => {
        env.workerToken = TOKEN;
    });

    it('runs the job for the scheduler and reports timing', async () => {
        const response = await asWorker(TOKEN).post(API_ENDPOINTS.WORKER.CLEANUP);

        const body = data<WorkerJobResponse>(response);
        expect(body.job).toBe('cleanup');
        expect(body.durationMs).toBeGreaterThanOrEqual(0);
        expect(body.stats).toEqual({});
    });

    it('refuses a missing token', async () => {
        const response = await api.post(API_ENDPOINTS.WORKER.CLEANUP);

        expect(response.status).toBe(401);
        expect(error(response).code).toBe(ERROR_CODES.UNAUTHENTICATED);
    });

    it('refuses a wrong token, including one of the right length', async () => {
        const wrong = TOKEN.replace(/./, (c) => (c === 'x' ? 'y' : 'x'));
        const response = await asWorker(wrong).post(API_ENDPOINTS.WORKER.CLEANUP);

        expect(response.status).toBe(401);
    });

    it('closes the route rather than opening it when no token is configured', async () => {
        env.workerToken = '';
        const response = await asWorker('anything').post(API_ENDPOINTS.WORKER.CLEANUP);

        expect(response.status).toBe(503);
        expect(error(response).code).toBe(ERROR_CODES.INTERNAL_ERROR);
    });
});
