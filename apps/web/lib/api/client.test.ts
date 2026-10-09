import { ERROR_CODES } from '@bzim/types';
import { describe, expect, it } from 'vitest';

import { ApiError, buildUrl, isErrorCode } from './client';

describe('buildUrl', () => {
    it('resolves an absolute endpoint path against the API origin', () => {
        expect(buildUrl('/api/v1/health')).toBe('http://localhost:4000/api/v1/health');
    });

    it('appends only the query values that are set', () => {
        const url = buildUrl('/api/v1/groups/public', { q: 'kaart', page: 2, from: undefined });
        expect(url).toBe('http://localhost:4000/api/v1/groups/public?q=kaart&page=2');
    });
});

describe('ApiError.fromResponse', () => {
    it('keeps the code the API sent', async () => {
        const response = new Response(
            JSON.stringify({ code: ERROR_CODES.FORBIDDEN, message: 'nope', details: { x: 1 } }),
            { status: 403, headers: { 'Content-Type': 'application/json' } },
        );

        const error = await ApiError.fromResponse(response);
        expect(error.code).toBe(ERROR_CODES.FORBIDDEN);
        expect(error.status).toBe(403);
        expect(error.details).toEqual({ x: 1 });
    });

    it('falls back to INTERNAL_ERROR for a body that is not ours', async () => {
        const response = new Response('<html>502 Bad Gateway</html>', { status: 502 });

        const error = await ApiError.fromResponse(response);
        expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
        expect(error.status).toBe(502);
    });
});

describe('isErrorCode', () => {
    it('accepts every known code and nothing else', () => {
        for (const code of Object.values(ERROR_CODES)) expect(isErrorCode(code)).toBe(true);
        expect(isErrorCode('SOMETHING_ELSE')).toBe(false);
        expect(isErrorCode(undefined)).toBe(false);
    });
});
