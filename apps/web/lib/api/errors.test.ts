import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@bzim/types';

import { ApiError } from './client';
import { errorKey, refusalProblem, toastWorthy } from './errors';

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

describe('refusalProblem', () => {
    it('reads the rule from a 422 and a 409 alike', () => {
        const input = new ApiError(ERROR_CODES.VALIDATION_FAILED, 422, 'no', {
            problem: 'TEAM_SIZE',
        });
        const timing = new ApiError(ERROR_CODES.CONFLICT, 409, 'no', { problem: 'NOT_DRAFT' });
        expect(refusalProblem(input)).toBe('TEAM_SIZE');
        expect(refusalProblem(timing)).toBe('NOT_DRAFT');
    });

    it('has none for other codes, other shapes and other errors', () => {
        expect(
            refusalProblem(new ApiError(ERROR_CODES.FORBIDDEN, 403, 'no', { problem: 'X' })),
        ).toBeNull();
        expect(refusalProblem(new ApiError(ERROR_CODES.CONFLICT, 409, 'no'))).toBeNull();
        expect(
            refusalProblem(new ApiError(ERROR_CODES.CONFLICT, 409, 'no', { problem: 3 })),
        ).toBeNull();
        expect(refusalProblem(new Error('x'))).toBeNull();
    });
});
