import type { Locale } from './enums';
import type { AvatarKey } from './constants';
import type { IsoDateTimeString, Uuid } from './domain';

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
/* Health and worker                                                           */
/* -------------------------------------------------------------------------- */

export interface HealthResponse {
    status: 'ok' | 'degraded';
    /** Whether a `SELECT 1` answered just now. */
    database: boolean;
    uptime: number;
    timestamp: string;
}

/** What a `POST /api/v1/worker/<job>` answers once the job has run. */
export interface WorkerJobResponse {
    job: string;
    durationMs: number;
    /** Counters the job chose to report, e.g. `{ eventsDeleted: 12 }`. */
    stats: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The signed-in user, as `GET /me` answers. The only place the email is ever
 * sent to a browser; other members see `UserSummary`.
 */
export interface MeResponse {
    id: Uuid;
    email: string;
    /** Null until onboarding; see `onboardingDone`. */
    handle: string | null;
    displayName: string | null;
    avatarKey: AvatarKey | null;
    locale: Locale;
    /** Whether the three profile fields are set; the app routes to onboarding when false. */
    onboardingDone: boolean;
    /** Which sign-in methods the account has. Both can be true. */
    hasPassword: boolean;
    hasGoogle: boolean;
    autoAddToCalendar: boolean;
    notifyEmailInvites: boolean;
    notifyEmailPlanned: boolean;
    notifyEmailNewActivity: boolean;
    createdAt: IsoDateTimeString;
}

/** `PATCH /me`. Every field optional; onboarding sends the first three together. */
export interface UpdateMeRequest {
    handle?: string;
    displayName?: string;
    avatarKey?: AvatarKey;
    locale?: Locale;
    autoAddToCalendar?: boolean;
    notifyEmailInvites?: boolean;
    notifyEmailPlanned?: boolean;
    notifyEmailNewActivity?: boolean;
}

/** `PATCH /me/password`. `currentPassword` is required when the account already has one. */
export interface ChangePasswordRequest {
    currentPassword?: string;
    newPassword: string;
}

export interface HandleAvailableResponse {
    /** False when taken or when the handle itself is not valid. */
    available: boolean;
}

/** What other members see of a person. Never the email. */
export interface UserSummary {
    id: Uuid;
    handle: string;
    displayName: string;
    avatarKey: AvatarKey;
}

/*
 * Group, activity, availability and leaderboard DTOs are added by the task
 * that introduces each endpoint, so that the DTO and the entity's toDto()
 * land in the same change.
 */
