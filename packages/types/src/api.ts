/* -------------------------------------------------------------------------- */
/* Envelopes                                                                   */
/*                                                                            */
/* Successful responses are the resource itself, with no wrapper. Lists are   */
/* bare arrays unless paginated. Errors are flat.                             */
/* -------------------------------------------------------------------------- */

/** Every non-2xx body. `code` is from `ERROR_CODES`; the client translates by code. */
export interface ApiErrorResponse {
    code: string;
    message: string;
    details?: unknown;
}

/** Query parameters accepted by every paginated list endpoint. */
export interface PaginationQuery {
    /** 1-based. */
    page?: number;
    /** Defaults to `PAGINATION.DEFAULT_PAGE_SIZE`, capped at `PAGINATION.MAX_PAGE_SIZE`. */
    pageSize?: number;
}

export interface Paginated<T> {
    items: T[];
    page: number;
    pageSize: number;
    /** Total matching rows, except on leaderboards where it is capped at `LEADERBOARD.RANK_LIMIT`. */
    total: number;
    hasMore: boolean;
}

/* -------------------------------------------------------------------------- */
/* Health                                                                      */
/* -------------------------------------------------------------------------- */

export interface HealthResponse {
    status: 'ok' | 'degraded';
    database: 'ok' | 'unreachable';
    uptime: number;
    timestamp: string;
}

/*
 * Resource DTOs (users, groups, activities, availability, leaderboards) are
 * added by the task that introduces each endpoint, so that the DTO and the
 * entity's toDto() land in the same change.
 */
