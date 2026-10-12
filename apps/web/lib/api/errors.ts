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

/**
 * Codes a form explains in place (a taken handle, a wrong password) or the
 * client already acts on (signed out). Everything else is unexpected where
 * it happens and surfaces as a toast, from one place: the mutation cache.
 */
const INLINE_CODES: ReadonlySet<string> = new Set([
    ERROR_CODES.VALIDATION_FAILED,
    ERROR_CODES.CONFLICT,
    ERROR_CODES.INVALID_CREDENTIALS,
    ERROR_CODES.EMAIL_NOT_VERIFIED,
    ERROR_CODES.TOKEN_INVALID,
    ERROR_CODES.OWNER_MUST_TRANSFER,
    ERROR_CODES.ONBOARDING_REQUIRED,
    ERROR_CODES.UNAUTHENTICATED,
]);

export function toastWorthy(error: unknown): boolean {
    return !(error instanceof ApiError && INLINE_CODES.has(error.code));
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

/**
 * The rule name a refusal carried in `details.problem`: a 422 about the input
 * or a 409 about timing. The tournament endpoints send both, and their screens
 * name every rule in their own sentence.
 */
export function refusalProblem(error: unknown): string | null {
    if (!(error instanceof ApiError)) return null;
    if (error.code !== ERROR_CODES.VALIDATION_FAILED && error.code !== ERROR_CODES.CONFLICT) {
        return null;
    }
    const problem = (error.details as { problem?: unknown } | undefined)?.problem;
    return typeof problem === 'string' ? problem : null;
}

/** How long a 429 asked to wait, in seconds, or null for anything else. */
export function retryAfterSeconds(error: unknown): number | null {
    if (!(error instanceof ApiError) || error.code !== ERROR_CODES.RATE_LIMITED) return null;
    const seconds = (error.details as { retryAfterSeconds?: unknown } | undefined)
        ?.retryAfterSeconds;
    return typeof seconds === 'number' && seconds > 0 ? seconds : null;
}

/** The sentence key for a refusal: `<namespace>.<rule>` when the API named its rule, else the code's. */
export function refusalKey(error: unknown, namespace: string): string {
    const problem = refusalProblem(error);
    return problem === null ? errorKey(error) : `${namespace}.${problem}`;
}
