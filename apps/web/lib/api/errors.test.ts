import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@bzim/types';

import { ApiError } from './client';
import { errorKey, toastWorthy } from './errors';

describe('toastWorthy', () => {
    it('leaves what a form explains inline to the form', () => {
        for (const code of [
            ERROR_CODES.VALIDATION_FAILED,
            ERROR_CODES.CONFLICT,
            ERROR_CODES.INVALID_CREDENTIALS,
            ERROR_CODES.UNAUTHENTICATED,
        ]) {
            expect(toastWorthy(new ApiError(code, 400, 'no'))).toBe(false);
        }
    });

    it('raises the rest, the network and our own bugs included', () => {
        expect(toastWorthy(new ApiError(ERROR_CODES.FORBIDDEN, 403, 'no'))).toBe(true);
        expect(toastWorthy(new ApiError('NETWORK', 0, 'no'))).toBe(true);
        expect(toastWorthy(new ApiError(ERROR_CODES.RATE_LIMITED, 429, 'no'))).toBe(true);
        expect(toastWorthy(new TypeError('undefined is not a function'))).toBe(true);
    });

    it('names the sentence by the code', () => {
        expect(errorKey(new ApiError(ERROR_CODES.NOT_FOUND, 404, 'no'))).toBe('errors.NOT_FOUND');
        expect(errorKey(new Error('x'))).toBe('errors.INTERNAL_ERROR');
    });
});
