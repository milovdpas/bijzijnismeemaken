import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES } from '@bzim/types';
import type { HealthResponse } from '@bzim/types';

import { api, error } from './support/client';

describe('health', () => {
    it('answers by asking the database, not by remembering that it once could', async () => {
        const response = await api.get(API_ENDPOINTS.HEALTH);

        expect(response.status).toBe(200);
        const body = response.body as HealthResponse;
        expect(body.status).toBe('ok');
        expect(body.database).toBe(true);
        expect(body.uptime).toBeGreaterThan(0);
    });
});

describe('hardening', () => {
    it('does not announce the framework', async () => {
        const response = await api.get(API_ENDPOINTS.HEALTH);

        expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('refuses to have its body re-read as something executable', async () => {
        const response = await api.get(API_ENDPOINTS.HEALTH);

        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['referrer-policy']).toBe('no-referrer');
    });

    it('answers unknown routes in the same error shape as everything else', async () => {
        const response = await api.get('/api/v1/does-not-exist');

        expect(response.status).toBe(404);
        expect(error(response).code).toBe(ERROR_CODES.NOT_FOUND);
    });

    it('rejects a body that is not JSON with a 400 rather than a crash', async () => {
        const response = await api
            .post(API_ENDPOINTS.WORKER.CLEANUP)
            .set('content-type', 'application/json')
            .send('{not json');

        expect(response.status).toBe(400);
    });
});
