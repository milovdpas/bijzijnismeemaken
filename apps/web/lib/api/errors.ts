import { ERROR_CODES } from '@bzim/types';

import { ApiError } from './client';

/**
 * The translation key for whatever went wrong.
 *
 * The UI never shows the server's `message`; it shows the sentence for the
 * `code`, in the person's language. Anything that is not an `ApiError` is a
 * bug on our side and reads as such.
 */
export function errorKey(error: unknown): string {
    if (error instanceof ApiError) {
        return `errors.${error.code}`;
    }
    return 'errors.INTERNAL_ERROR';
}

/** Whether a failed request carried this code. */
export function isApiError(error: unknown, code: string): boolean {
    return error instanceof ApiError && error.code === code;
}

/** The rule name a 422 carried in `details.problem`, if any; forms turn it into their own sentence. */
export function validationProblem(error: unknown): string | null {
    if (!(error instanceof ApiError) || error.code !== ERROR_CODES.VALIDATION_FAILED) return null;
    const problem = (error.details as { problem?: unknown } | undefined)?.problem;
    return typeof problem === 'string' ? problem : null;
}
