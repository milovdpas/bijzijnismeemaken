import { API_ENDPOINTS, ERROR_CODES } from '@bzim/types';
import type { ApiErrorResponse, ErrorCode } from '@bzim/types';

import { API_URL } from '@/lib/site';

/**
 * The single way the browser talks to the Express API.
 *
 * Cookies carry the session, so every request goes out with credentials and
 * the API's CORS allows this origin. A 401 is retried exactly once after a
 * refresh; a refresh that fails hands the user to the login page. Everything
 * else is surfaced as an `ApiError` whose `code` the UI translates; the
 * server's `message` is for developers and is never shown.
 */

export class ApiError extends Error {
    readonly code: ErrorCode | 'NETWORK';
    readonly status: number;
    readonly details: unknown;

    constructor(code: ErrorCode | 'NETWORK', status: number, message: string, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
        this.details = details;
    }

    /** Reads the flat `{ code, message, details }` body the API answers with. */
    static async fromResponse(response: Response): Promise<ApiError> {
        let body: Partial<ApiErrorResponse> = {};
        try {
            body = (await response.json()) as Partial<ApiErrorResponse>;
        } catch {
            // A proxy error page or an empty body; the status still says enough.
        }
        return new ApiError(
            isErrorCode(body.code) ? body.code : ERROR_CODES.INTERNAL_ERROR,
            response.status,
            body.message ?? `Request failed with status ${String(response.status)}`,
            body.details,
        );
    }
}

export function isErrorCode(value: unknown): value is ErrorCode {
    return typeof value === 'string' && (Object.values(ERROR_CODES) as string[]).includes(value);
}

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    /** Query string values; `undefined` entries are left out. */
    query?: Record<string, string | number | boolean | undefined>;
    signal?: AbortSignal;
}

/** Builds the absolute URL for an `API_ENDPOINTS` path plus optional query. */
export function buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(path, API_URL);
    if (query !== undefined) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined) url.searchParams.set(key, String(value));
        }
    }
    return url.toString();
}

/**
 * Where the user goes when a refresh fails. A setter rather than an import of
 * the router, so this module stays free of React and testable in node.
 */
let onUnauthenticated: () => void = () => {
    // A full navigation on purpose: the session is gone, so the query cache and
    // any half-filled form should go with it. AuthGate (task 10) replaces this
    // with a router push once it owns the login route.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a reload, not a route change: the dead session's query cache and form state must go too
    if (typeof window !== 'undefined') window.location.href = '/login';
};

export function setUnauthenticatedHandler(handler: () => void): void {
    onUnauthenticated = handler;
}

/**
 * Single-flight refresh: ten queries failing at once produce one refresh call,
 * and they all wait for the same answer.
 */
let refreshing: Promise<boolean> | null = null;

/**
 * Exported for the few places that leave the app by a plain navigation to
 * the API (the calendar connect): those carry only the cookies, so the
 * access cookie is renewed first rather than landing on a 401 page.
 */
export async function refreshSession(): Promise<boolean> {
    refreshing ??= fetch(buildUrl(API_ENDPOINTS.AUTH.REFRESH), {
        method: 'POST',
        credentials: 'include',
    })
        .then((response) => response.ok)
        .catch(() => false)
        .finally(() => {
            refreshing = null;
        });
    return refreshing;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    try {
        return await fetch(buildUrl(path, options.query), {
            method: options.method ?? 'GET',
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            credentials: 'include',
            cache: 'no-store',
            signal: options.signal,
        });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        throw new ApiError('NETWORK', 0, 'The API could not be reached.');
    }
}

/**
 * Performs a request and returns the parsed body.
 *
 * `T` must be named at the call site, as with the API's `sendSuccess<T>`:
 * `request<GroupResponse[]>(API_ENDPOINTS.GROUPS.LIST)`. The refresh endpoint
 * itself is never retried, which is what stops a dead session looping.
 */
export async function request<T = never>(path: string, options: RequestOptions = {}): Promise<T> {
    let response = await send(path, options);

    if (response.status === 401 && path !== API_ENDPOINTS.AUTH.REFRESH) {
        // Only a dead session is worth a refresh. A wrong password or an
        // unverified address also answers 401, and those must reach the form
        // as the error they are, not bounce the person through the login page.
        const error = await ApiError.fromResponse(response.clone());
        if (error.code !== ERROR_CODES.UNAUTHENTICATED) {
            throw error;
        }
        const refreshed = await refreshSession();
        if (!refreshed) {
            onUnauthenticated();
            throw error;
        }
        response = await send(path, options);
    }

    if (!response.ok) {
        throw await ApiError.fromResponse(response);
    }
    if (response.status === 204) {
        return undefined as T;
    }
    return (await response.json()) as T;
}
