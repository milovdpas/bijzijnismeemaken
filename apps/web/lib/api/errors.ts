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
