import type {
    ActivityCategory,
    ActivityLabel,
    CalendarConnectionStatus,
    CalendarEventType,
    CalendarIgnoreRuleKind,
    CalendarProviderKey,
    DateMode,
    Daypart,
    EditMode,
    GroupAccess,
    GroupRole,
    LeaderboardPeriod,
    Locale,
    MatchSlot,
    MatchStage,
    MatchStatus,
    NotificationType,
    OccurrenceStatus,
    ParticipantMode,
    ScoreType,
    SortOrder,
    TournamentFormat,
    TournamentStatus,
    Weekday,
    WidgetType,
} from './enums';
import type { AvatarKey } from './constants';
import type { IsoDateString, IsoDateTimeString, LocalTimeString, ScoreValue, Uuid } from './domain';

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
    /** The optional setup steps after the profile: done or skipped, either way seen. */
    setup: { calendarSeen: boolean; availabilitySeen: boolean };
    createdAt: IsoDateTimeString;
}

/** The optional setup steps; `POST /me/setup/:step` marks one seen. */
export type SetupStep = 'calendar' | 'availability';

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

/** One browser that gets push notifications. The keys stay on the server. */
export interface PushSubscriptionDto {
    id: string;
    endpoint: string;
    userAgent: string | null;
    createdAt: IsoDateTimeString;
    lastUsedAt: IsoDateTimeString | null;
}

/**
 * `GET /me/push-subscriptions`. `publicKey` is the VAPID key the browser
 * subscribes with; null means this server cannot push and the UI says so.
 */
export interface PushSubscriptionsResponse {
    publicKey: string | null;
    subscriptions: PushSubscriptionDto[];
}

/** `POST /me/push-subscriptions`: `PushSubscription.toJSON()` from the browser. */
export interface CreatePushSubscriptionRequest {
    endpoint: string;
    keys: { p256dh: string; auth: string };
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
    /** A picture for the group, like an activity's; null means none. */
    imageUrl: string | null;
    /** The photographer, when the picture came from the stock photo search. */
    imageCreditName: string | null;
    imageCreditUrl: string | null;
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
    imageUrl?: string | null;
    imageCreditName?: string | null;
    imageCreditUrl?: string | null;
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
    /** For the owner's eyes only: the titles of the calendar events that make each daypart busy. */
    calendarTitles: Record<Daypart, string[]>;
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

/** One candidate moment for an activity, ranked by how many of the chosen people are free. */
export interface SuggestionDto {
    date: IsoDateString;
    daypart: Daypart;
    freeCount: number;
    freeIds: Uuid[];
    busyIds: Uuid[];
    /** Something else in the group is already planned then. Shown, not excluded. */
    conflict: boolean;
}

/** `GET …/activities/:id/suggestions?memberIds=&from=&weeks=`. */
export interface SuggestionsResponse {
    items: SuggestionDto[];
    /** How many candidates were ranked; `items` is the top of them. */
    total: number;
    /** The people the ranking counted. */
    memberIds: Uuid[];
    from: IsoDateString;
    to: IsoDateString;
}

/* -------------------------------------------------------------------------- */
/* Leaderboards                                                                */
/* -------------------------------------------------------------------------- */

/** A leaderboard's own settings. The creator is null once they left or deleted their account. */
export interface LeaderboardDto {
    id: Uuid;
    groupId: Uuid;
    name: string;
    description: string | null;
    scoreType: ScoreType;
    sortOrder: SortOrder;
    editMode: EditMode;
    showMonthly: boolean;
    showYearly: boolean;
    showAllTime: boolean;
    /** Plus and minus buttons beside each score. Only ever true on a `number` board. */
    showSteppers: boolean;
    /** The ranking the board's card shows the top of; always one of the shown periods. */
    cardPeriod: LeaderboardPeriod;
    creator: UserSummary | null;
    creatorName: string | null;
    createdAt: IsoDateTimeString;
    updatedAt: IsoDateTimeString;
}

/** The list: each board plus what the caller may do with it. */
export interface LeaderboardListingDto extends LeaderboardDto {
    memberCount: number;
    /** The head of the `cardPeriod` ranking, now; at most `LEADERBOARD.CARD_TOP` entries. */
    top: ScoreEntryDto[];
    /** Settings and deletion: creator or group admin. */
    canManage: boolean;
    /** Setting scores: by edit mode, plus group admins. */
    canEditScores: boolean;
}

/**
 * Somebody on a board. `user` is null once they left the group; the
 * snapshots keep their name and face on the ranking. Removed members keep
 * their row (and their history) with `removedAt` set.
 */
export interface LeaderboardMemberDto {
    id: Uuid;
    user: UserSummary | null;
    displayName: string;
    avatarKey: AvatarKey;
    addedAt: IsoDateTimeString;
    removedAt: IsoDateTimeString | null;
}

export interface LeaderboardDetailDto extends LeaderboardListingDto {
    members: LeaderboardMemberDto[];
    /** Only meaningful when `editMode` is `selected`. */
    editors: UserSummary[];
}

/** `POST` and `PATCH /groups/:id/leaderboards[/:id]`; every field optional on PATCH. */
export interface LeaderboardInput {
    name: string;
    description?: string | null;
    scoreType: ScoreType;
    sortOrder: SortOrder;
    editMode: EditMode;
    /** Replaces the editor list; only read when `editMode` is `selected`. */
    editorIds?: Uuid[];
    showMonthly: boolean;
    showYearly: boolean;
    showAllTime: boolean;
    /** Default false; forced false on a `time` board. */
    showSteppers?: boolean;
    /** Default: the first shown period; a hidden one is replaced by that. */
    cardPeriod?: LeaderboardPeriod;
}

/** One row of a ranking. */
export interface ScoreEntryDto {
    rank: number;
    member: LeaderboardMemberDto;
    score: ScoreValue;
    /** When this value was set; the tie-break (first to reach a score ranks higher). */
    updatedAt: IsoDateTimeString;
}

/**
 * The caller's own place on the board. `rank` is the number as a string, or
 * "500+" when they are below `LEADERBOARD.RANK_LIMIT`: the API stops counting there.
 */
export interface MyScoreDto {
    rank: string;
    score: ScoreValue;
}

/** `GET …/scores?period=&year=&month=&page=&pageSize=`. `total` is capped at `LEADERBOARD.RANK_LIMIT`. */
export interface ScoresResponse extends Paginated<ScoreEntryDto> {
    period: LeaderboardPeriod;
    year: number | null;
    month: number | null;
    /** The caller's own entry when they are on the board with a score for this period. */
    me: MyScoreDto | null;
}

/** `GET …/periods`: which months and years have scores, newest first, for the pickers. */
export interface PeriodsResponse {
    months: { year: number; month: number }[];
    years: number[];
}

/** One change in a board's history. `newScore` null means cleared or removed. */
export interface ScoreHistoryDto {
    id: Uuid;
    member: LeaderboardMemberDto;
    changedBy: UserSummary | null;
    changedByName: string;
    oldScore: ScoreValue | null;
    newScore: ScoreValue | null;
    year: number;
    month: number;
    createdAt: IsoDateTimeString;
}

/** `PUT …/members/:id/score`. Absolute, for the current period only. */
export interface SetScoreRequest {
    score: ScoreValue;
}

/**
 * `POST …/leaderboards/:id/members`: a group member by id, or a guest by
 * name (somebody without an account, kept on the board as name and avatar
 * only). Exactly one of `userId` and `name`.
 */
export interface AddLeaderboardMemberRequest {
    userId?: Uuid;
    name?: string;
    /** For a guest; a random one when absent. */
    avatarKey?: AvatarKey;
}

/* -------------------------------------------------------------------------- */
/* Dashboard widgets                                                           */
/* -------------------------------------------------------------------------- */

export interface UpcomingWidgetConfig {
    weeks: number;
}
export interface IdeasWidgetConfig {
    limit: number;
}
export interface LeaderboardWidgetConfig {
    leaderboardId: Uuid;
    period: LeaderboardPeriod;
    limit: number;
}
export interface NoteWidgetConfig {
    title: string;
    body: string;
}
export interface ActivityWidgetConfig {
    activityId: Uuid;
}
export interface LinkWidgetConfig {
    label: string;
    url: string;
}

/** A widget's type with the config that type carries; the pair is validated together. */
export type WidgetSpec =
    | { type: WidgetType.UPCOMING; config: UpcomingWidgetConfig }
    | { type: WidgetType.IDEAS; config: IdeasWidgetConfig }
    | { type: WidgetType.LEADERBOARD; config: LeaderboardWidgetConfig }
    | { type: WidgetType.NOTE; config: NoteWidgetConfig }
    | { type: WidgetType.ACTIVITY; config: ActivityWidgetConfig }
    | { type: WidgetType.LINK; config: LinkWidgetConfig };

export type WidgetConfig = WidgetSpec['config'];

/** `GET /groups/:id/widgets`: the dashboard in order, config only; each widget fetches its own data. */
export type GroupWidgetDto = WidgetSpec & {
    id: Uuid;
    position: number;
    createdAt: IsoDateTimeString;
    updatedAt: IsoDateTimeString;
};

/** `POST /groups/:id/widgets`: appended at the end. */
export type AddWidgetRequest = WidgetSpec;

/** `PATCH /groups/:id/widgets/:id`: a new config for the widget's own type. */
export interface UpdateWidgetRequest {
    config: WidgetConfig;
}

/** `PUT /groups/:id/widgets/order`: every widget id of the group, in the wanted order. */
export interface ReorderWidgetsRequest {
    widgetIds: Uuid[];
}

/* -------------------------------------------------------------------------- */
/* Calendar (M2)                                                               */
/* -------------------------------------------------------------------------- */

/** One calendar inside a connection; only enabled ones are synced. */
export interface CalendarSourceDto {
    id: Uuid;
    name: string;
    isPrimary: boolean;
    enabled: boolean;
    timeZone: string;
}

/** `GET /me/calendar`: the connection as its owner sees it; tokens never leave the server. */
export interface CalendarConnectionDto {
    id: Uuid;
    provider: CalendarProviderKey;
    accountEmail: string;
    hasWriteScope: boolean;
    status: CalendarConnectionStatus;
    lastSyncedAt: IsoDateTimeString | null;
    lastError: string | null;
    sources: CalendarSourceDto[];
    createdAt: IsoDateTimeString;
}

/** `GET /me/calendar/events`: the owner's own synced events, titles included, for the ignore rules. */
export interface CalendarEventDto {
    id: Uuid;
    sourceId: Uuid;
    recurringEventId: string | null;
    title: string;
    startAt: IsoDateTimeString;
    endAt: IsoDateTimeString;
    allDay: boolean;
    transparent: boolean;
    eventType: CalendarEventType;
}

export interface CalendarIgnoreRuleDto {
    id: Uuid;
    kind: CalendarIgnoreRuleKind;
    /** The lowercased title, or the series id. */
    value: string;
    label: string;
    createdAt: IsoDateTimeString;
}

/** `PATCH /me/calendar/sources/:id`. */
export interface UpdateCalendarSourceRequest {
    enabled: boolean;
}

/** `POST /me/calendar/ignore-rules`. The same rule twice answers 200 with the existing one. */
export interface CalendarIgnoreRuleInput {
    kind: CalendarIgnoreRuleKind;
    value: string;
    label: string;
}

/* -------------------------------------------------------------------------- */
/* Tournaments (M4)                                                            */
/* -------------------------------------------------------------------------- */

/** The settings a tournament is made with; most can change only while it is a draft. */
export interface TournamentSettings {
    name: string;
    description: string | null;
    format: TournamentFormat;
    participantMode: ParticipantMode;
    /** People per team; null when players play. */
    teamSize: number | null;
    winPoints: number;
    drawPoints: number;
    /** Groups in the group stage; null for a knockout from the start. */
    groupCount: number | null;
    advancePerGroup: number | null;
    thirdPlace: boolean;
}

/** `POST /groups/:id/tournaments`. Points and third place default to 3, 1 and off. */
export interface TournamentInput {
    name: string;
    description?: string | null;
    format: TournamentFormat;
    participantMode: ParticipantMode;
    teamSize?: number | null;
    winPoints?: number;
    drawPoints?: number;
    groupCount?: number | null;
    advancePerGroup?: number | null;
    thirdPlace?: boolean;
    /** An activity of category `tournament` in the same group; it then links to this. */
    activityId?: Uuid | null;
}

/** A person in an entry: a group member, or a guest by name. */
export interface TournamentPersonInput {
    userId?: Uuid;
    name?: string;
}

/**
 * `POST …/entries`. A member (`userId`) or a guest (`name`) as a player, or,
 * when teams play, a team: `members`, with an optional `name`.
 */
export interface TournamentEntryInput {
    userId?: Uuid;
    name?: string;
    members?: TournamentPersonInput[];
}

/** `PATCH …/entries/:id`, while a draft. `seed` moves the entry in the draw, the rest shift. */
export interface TournamentEntryPatch {
    name?: string;
    members?: TournamentPersonInput[];
    seed?: number;
    groupNo?: number;
}

/** `POST …/entries/:id/swap`: the two entries trade places in the draw, seed and group. */
export interface TournamentSwapInput {
    withEntryId: Uuid;
}

/** `POST …/draw`: shuffle the seeds; with `teams`, first deal the people into random teams. */
export interface TournamentDrawInput {
    teams?: boolean;
}

/** `PUT …/matches/:id/result`. A knockout match cannot end level. */
export interface MatchResultInput {
    homeScore: number;
    awayScore: number;
}

export interface TournamentMemberDto {
    id: Uuid;
    /** Null for a guest, and for somebody who left the group. */
    user: UserSummary | null;
    displayName: string;
    avatarKey: AvatarKey | null;
}

export interface TournamentEntryDto {
    id: Uuid;
    name: string;
    /** 1 is the top seed. */
    seed: number;
    groupNo: number | null;
    /** By name: a team saved at once has no order of its own. */
    members: TournamentMemberDto[];
}

export interface TournamentMatchDto {
    id: Uuid;
    stage: MatchStage;
    groupNo: number | null;
    round: number;
    position: number;
    homeEntryId: Uuid | null;
    awayEntryId: Uuid | null;
    homeScore: number | null;
    awayScore: number | null;
    winnerEntryId: Uuid | null;
    status: MatchStatus;
    nextMatchId: Uuid | null;
    nextSlot: MatchSlot | null;
    /** One side empty, the other through without playing. */
    isBye: boolean;
    playedAt: IsoDateTimeString | null;
}

/**
 * A knockout match as the start would make it from the draw as it stands:
 * no id and no result yet. A bye's entry is already in the next round.
 */
export interface TournamentPreviewMatchDto {
    stage: MatchStage;
    round: number;
    position: number;
    homeEntryId: Uuid | null;
    awayEntryId: Uuid | null;
    /** One side empty, the other through without playing. */
    isBye: boolean;
}

/** A match as one viewer sees it in the detail. */
export interface TournamentMatchView extends TournamentMatchDto {
    /** Whether the viewer may enter (or, as organiser or admin, correct) the result now. */
    canReport: boolean;
}

export interface TournamentStandingDto {
    entryId: Uuid;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    scored: number;
    conceded: number;
    difference: number;
    points: number;
    rank: number;
    /** Within the places that go through to the knockout. */
    qualifies: boolean;
}

export interface TournamentGroupDto {
    groupNo: number;
    standings: TournamentStandingDto[];
}

/** A tournament's own fields, with its organiser. */
export interface TournamentDto extends TournamentSettings {
    id: Uuid;
    groupId: Uuid;
    status: TournamentStatus;
    activityId: Uuid | null;
    organiser: UserSummary | null;
    /** The organiser's name, kept when they leave the group. */
    organiserName: string | null;
    winnerEntryId: Uuid | null;
    createdAt: IsoDateTimeString;
    startedAt: IsoDateTimeString | null;
    finishedAt: IsoDateTimeString | null;
}

/** A tournament in the list: running and drafts on the tab, finished ones in the archive. */
export interface TournamentListingDto extends TournamentDto {
    entryCount: number;
    /** The winning entry's name, once finished. */
    winnerName: string | null;
}

/**
 * `GET …/tournaments/:id`: everything to draw the tournament, plus what the
 * viewer may do with it.
 */
export interface TournamentDetailDto extends TournamentListingDto {
    activity: { id: Uuid; title: string } | null;
    /** The organiser, or a group admin: settings, entries, draw, start, advance, finish, results. */
    canManage: boolean;
    /** The entries the viewer plays in. */
    myEntryIds: Uuid[];
    /** While a draft: why it cannot start yet (a problem code), or null when it can. */
    startProblem: string | null;
    /** Every group match is played and the knockout is not drawn yet. */
    canAdvance: boolean;
    /** The final is played. */
    canFinish: boolean;
    entries: TournamentEntryDto[];
    /** While a knockout is a draft: its bracket as the start would draw it. Empty otherwise. */
    preview: TournamentPreviewMatchDto[];
    matches: TournamentMatchView[];
    /** One table per group, for a group stage; empty for a knockout. */
    groups: TournamentGroupDto[];
}
