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
    /** Photographer credit when the picture came from the stock photo search. */
    imageCreditName: string | null;
    imageCreditUrl: string | null;
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
    imageCreditName?: string | null;
    imageCreditUrl?: string | null;
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
    activity: {
        id: Uuid;
        title: string;
        category: ActivityCategory;
        /** For the availability overlay: how long a timed occurrence blocks. */
        durationMinutes: number | null;
    };
    /** Other planned occurrences in the group on the same day whose time window overlaps. */
    conflictsWith: Uuid[];
}

/* -------------------------------------------------------------------------- */
/* Images                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One stock photo. `url` is what gets stored on the activity; `previewUrl` is
 * for the picker; `useToken` goes back to `POST /images/used` once the photo
 * is picked, which is how the provider counts a download.
 */
export interface ImageResultDto {
    id: string;
    useToken: string;
    url: string;
    previewUrl: string;
    width: number;
    height: number;
    alt: string;
    photographer: string;
    photographerUrl: string;
}

/** `GET /images/search?q=&page=`. */
export interface ImageSearchResponse {
    items: ImageResultDto[];
    hasMore: boolean;
}

/** `POST /images/used`. */
export interface ImageUsedRequest {
    useToken: string;
}

/* -------------------------------------------------------------------------- */
/* Availability                                                                */
/* -------------------------------------------------------------------------- */

/** Why a daypart is busy. Only the person themselves ever sees the reason. */
export type AvailabilityReason = 'manual' | 'rule' | 'calendar';

/** One day of the caller's own availability: each daypart free (null) or busy for a reason. */
export interface MyAvailabilityDay {
    date: IsoDateString;
    dayparts: Record<Daypart, AvailabilityReason | null>;
}

/** `GET /me/availability?from=&to=`. */
export interface MyAvailabilityResponse {
    from: IsoDateString;
    to: IsoDateString;
    days: MyAvailabilityDay[];
}

/** One day of a group: per daypart, who is busy. Everyone else in `users` is free. */
export interface GroupAvailabilityDay {
    date: IsoDateString;
    dayparts: Record<Daypart, { busy: Uuid[] }>;
}

export interface AvailabilityUser {
    user: UserSummary;
    /** Whether a calendar feeds this person's availability; false means "free unless they said otherwise". */
    hasCalendar: boolean;
}

/** `GET /groups/:id/availability?from=&to=&activityId=`. */
export interface GroupAvailabilityResponse {
    from: IsoDateString;
    to: IsoDateString;
    users: AvailabilityUser[];
    days: GroupAvailabilityDay[];
}

/** A one-off block: this date, this daypart. `PUT` adds, `DELETE` removes, both with this body. */
export interface UnavailabilityDto {
    date: IsoDateString;
    daypart: Daypart;
}

/** A weekly rule: every `weekday`, this daypart, within the optional validity range. */
export interface UnavailabilityRuleDto {
    id: Uuid;
    weekday: Weekday;
    daypart: Daypart;
    validFrom: IsoDateString | null;
    validUntil: IsoDateString | null;
}

/** `POST` and `PATCH /me/unavailability-rules[/:id]`; all optional on PATCH. */
export interface UnavailabilityRuleInput {
    weekday: Weekday;
    daypart: Daypart;
    validFrom?: IsoDateString | null;
    validUntil?: IsoDateString | null;
}
