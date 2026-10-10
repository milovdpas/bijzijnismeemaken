import type {
    ActivityCategory,
    ActivityLabel,
    DateMode,
    Daypart,
    GroupAccess,
    GroupRole,
    Locale,
    NotificationType,
    OccurrenceStatus,
    Weekday,
} from './enums';
import type { AvatarKey } from './constants';
import type { IsoDateString, IsoDateTimeString, LocalTimeString, Uuid } from './domain';

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
    createdAt: IsoDateTimeString;
}

/** `PATCH /me`. Every field optional; onboarding sends the first three together. */
export interface UpdateMeRequest {
    handle?: string;
    displayName?: string;
    avatarKey?: AvatarKey;
    locale?: Locale;
    autoAddToCalendar?: boolean;
}

/**
 * One notification type and the channels it may use. `GET /me/notification-settings`
 * returns one per `NotificationType`, defaults filled in for types never touched.
 */
export interface NotificationSettingDto {
    type: NotificationType;
    email: boolean;
    push: boolean;
}

/** `PUT /me/notification-settings/:type`. Both channels, so the row is always whole. */
export interface UpdateNotificationSettingRequest {
    email: boolean;
    push: boolean;
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

/* -------------------------------------------------------------------------- */
/* Groups                                                                      */
/* -------------------------------------------------------------------------- */

export interface GroupResponse {
    id: Uuid;
    name: string;
    slug: string;
    description: string | null;
    access: GroupAccess;
    createdAt: IsoDateTimeString;
}

/** A group in the caller's own list: what it is, and what they are in it. */
export interface GroupListingResponse extends GroupResponse {
    role: GroupRole;
    memberCount: number;
}

/** A group in the public overview, for people who are not in it yet. */
export interface PublicGroupResponse extends GroupResponse {
    memberCount: number;
}

/**
 * One group, for a member. `inviteLink` is only filled for admins and owners
 * of an invite-link group; everybody else sees null.
 */
export interface GroupDetailResponse extends GroupListingResponse {
    inviteLink: string | null;
}

/** `POST /groups` and `PATCH /groups/:id` (all optional on PATCH). */
export interface GroupInput {
    name: string;
    description?: string | null;
    access: GroupAccess;
}

/** What an invite link shows before the person decides to join. */
export interface JoinPreviewResponse {
    id: Uuid;
    name: string;
    description: string | null;
    memberCount: number;
    alreadyMember: boolean;
}

export interface InviteLinkResponse {
    inviteLink: string;
}

export interface GroupMemberResponse {
    user: UserSummary;
    role: GroupRole;
    joinedAt: IsoDateTimeString;
}

/**
 * A pending invitation. The same shape serves the admin's pending list (who
 * was invited) and the invitee's own list (which group, by whom).
 */
export interface GroupInviteDto {
    id: Uuid;
    group: { id: Uuid; name: string };
    invitedUser: UserSummary;
    /** Null once the inviter has left or deleted their account. */
    invitedBy: UserSummary | null;
    createdAt: IsoDateTimeString;
}

/** `POST /groups/:id/invites`. */
export interface InviteRequest {
    handle: string;
}

/* -------------------------------------------------------------------------- */
/* Activities                                                                  */
/* -------------------------------------------------------------------------- */

/** An activity's own columns. The creator is null once they left or deleted their account. */
export interface ActivityDto {
    id: Uuid;
    groupId: Uuid;
    category: ActivityCategory;
    title: string;
    description: string | null;
    imageUrl: string | null;
    isRecurring: boolean;
    dateMode: DateMode;
    specificDate: IsoDateString | null;
    weekday: Weekday | null;
    startTime: LocalTimeString | null;
    locationText: string | null;
    locationUrl: string | null;
    minPeople: number | null;
    maxPeople: number | null;
    costPerPerson: number | null;
    durationMinutes: number | null;
    externalUrl: string | null;
    preferredDayparts: Daypart[] | null;
    /** False once the creator left the group; hidden from members, visible to admins. */
    isActive: boolean;
    creator: UserSummary | null;
    /** The creator's name as it was, for when `creator` is null. */
    creatorName: string | null;
    createdAt: IsoDateTimeString;
    updatedAt: IsoDateTimeString;
}

/** One planned (or done, or cancelled) moment of an activity, with who is in it. */
export interface OccurrenceDto {
    id: Uuid;
    activityId: Uuid;
    date: IsoDateString;
    daypart: Daypart | null;
    startTime: LocalTimeString | null;
    status: OccurrenceStatus;
    notes: string | null;
    plannedBy: UserSummary | null;
    participants: UserSummary[];
    createdAt: IsoDateTimeString;
}

/** The activity list: each row plus what the list needs to sort, filter and show. */
export interface ActivityListingDto extends ActivityDto {
    /** Derived: planned if any occurrence is planned, done for a finished one-off, idea otherwise. */
    label: ActivityLabel;
    /** The earliest planned occurrence, past ones included (they await confirmation). */
    nextOccurrence: OccurrenceDto | null;
    interestCount: number;
    /** Whether the caller marked themselves (or was marked) in. */
    iAmIn: boolean;
}

export interface ActivityDetailDto extends ActivityListingDto {
    interests: UserSummary[];
    /** Newest date first. */
    occurrences: OccurrenceDto[];
}

/** `POST` and `PATCH /groups/:id/activities[/:id]`; every field optional on PATCH. */
export interface ActivityInput {
    category: ActivityCategory;
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    isRecurring: boolean;
    dateMode: DateMode;
    specificDate?: IsoDateString | null;
    weekday?: Weekday | null;
    startTime?: LocalTimeString | null;
    locationText?: string | null;
    locationUrl?: string | null;
    minPeople?: number | null;
    maxPeople?: number | null;
    costPerPerson?: number | null;
    durationMinutes?: number | null;
    externalUrl?: string | null;
    preferredDayparts?: Daypart[] | null;
}

/** `POST …/activities/:id/occurrences`. Participants must be among the activity's "in" members. */
export interface OccurrenceInput {
    date: IsoDateString;
    daypart?: Daypart | null;
    startTime?: LocalTimeString | null;
    notes?: string | null;
    participantIds: Uuid[];
}

/** `PATCH …/occurrences/:id`. Re-date, change who counts, or move the status. */
export interface OccurrenceUpdateInput {
    date?: IsoDateString;
    daypart?: Daypart | null;
    startTime?: LocalTimeString | null;
    notes?: string | null;
    participantIds?: Uuid[];
    status?: OccurrenceStatus;
}

/** A planned occurrence in the group agenda, with the activity it belongs to and what it clashes with. */
export interface GroupOccurrenceDto extends OccurrenceDto {
    activity: { id: Uuid; title: string; category: ActivityCategory };
    /** Other planned occurrences in the group on the same day whose time window overlaps. */
    conflictsWith: Uuid[];
}
