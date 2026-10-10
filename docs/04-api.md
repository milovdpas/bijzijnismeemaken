# 04 — API design

Base path `/api/v1`, JSON only, auth = access cookie unless noted.


Permission shorthand: **M** = group member, **A** = admin or owner, **O** = owner, **C** = resource creator, **E** = leaderboard editor (per edit_mode), **S** = self.

## Auth & users
| Method | Path | Purpose | Perm |
|---|---|---|---|
| GET | `/auth/google` | Start login (query `returnTo`) | public |
| GET | `/auth/google/callback` | OAuth callback → cookies → redirect | public |
| POST | `/auth/refresh` | Rotate token pair | refresh cookie |
| POST | `/auth/logout` | Revoke + clear cookies | any |
| POST | `/auth/register` | `{ email, password, locale? }` → 201, sends verification email | public (rate limited) |
| POST | `/auth/login` | `{ email, password }` → cookies; `EMAIL_NOT_VERIFIED` or `INVALID_CREDENTIALS` | public (rate limited by address + email) |
| POST | `/auth/verify-email` | `{ token }` → marks verified, cookies | public |
| POST | `/auth/resend-verification` | `{ email }` → always 204 | public (rate limited) |
| POST | `/auth/forgot-password` | `{ email }` → always 204, sends reset link if the email exists | public (rate limited) |
| POST | `/auth/reset-password` | `{ token, password }` → 204, revokes all sessions | public |
| PATCH | `/me/password` | `{ currentPassword?, newPassword }`; current required when a password exists; revokes other sessions | S |
| GET | `/me` | Current user + preferences + `onboardingDone` | S |
| PATCH | `/me` | handle, display_name, avatar_key, locale, auto_add_to_calendar | S |
| GET | `/me/notification-settings` | One entry per `NotificationType` with `email` + `push`, defaults filled in | S |
| PUT | `/me/notification-settings/:type` | `{ email, push }` upsert | S |
| GET | `/users/handle-available?handle=` | Onboarding check | any |
| GET | `/users/search?q=` | Handle prefix search (for invites), returns id/handle/display_name/avatar | any (rate limited) |
| DELETE | `/me` | Delete account (409 `OWNER_MUST_TRANSFER` if owning groups) | S |
| GET | `/avatars` | Static list of avatar keys (could be a constant in `@bzim/types` instead) | any |

## Groups & membership
| Method | Path | Purpose | Perm |
|---|---|---|---|
| GET | `/groups` | My groups with role + counts | any |
| POST | `/groups` | Create (name, description, access) | any |
| GET | `/groups/public?q=&page=` | Public group search | any |
| GET | `/groups/:groupId` | Detail (settings visible to A) | M |
| PATCH | `/groups/:groupId` | name/description/access | A |
| DELETE | `/groups/:groupId` | Delete group | O |
| POST | `/groups/:groupId/join` | Join public group | any |
| GET | `/join/:token` | Resolve invite link → group preview (name, member count) | any |
| POST | `/join/:token` | Join via link | any |
| POST | `/groups/:groupId/invite-link/regenerate` | New token | A |
| GET | `/groups/:groupId/members` | Members with roles | M |
| PATCH | `/groups/:groupId/members/:userId` | role: admin/member (promote/demote) | O |
| DELETE | `/groups/:groupId/members/:userId` | Remove member (A cannot remove A/O) | A |
| POST | `/groups/:groupId/transfer-ownership` | `{ userId }` | O |
| POST | `/groups/:groupId/leave` | Leave (409 if owner) | M (not O) |
| POST | `/groups/:groupId/invites` | `{ handle }` → invite + notification | A |
| GET | `/groups/:groupId/invites` | Pending invites | A |
| DELETE | `/groups/:groupId/invites/:inviteId` | Cancel | A |
| GET | `/invites` | My pending invites | S |
| POST | `/invites/:inviteId/accept` · `/decline` | Respond | invitee |

## Activities & occurrences
| Method | Path | Purpose | Perm |
|---|---|---|---|
| GET | `/groups/:groupId/activities?label=&recurring=&weekday=&includeInactive=` | List with derived label, next occurrence, interest count, `iAmIn` | M (inactive only A) |
| POST | `/groups/:groupId/activities` | Create | M |
| GET | `/groups/:groupId/activities/:activityId` | Detail incl. interests (users), occurrences | M |
| PATCH | `/groups/:groupId/activities/:activityId` | Edit | C, A |
| DELETE | `/groups/:groupId/activities/:activityId` | Delete | C, A |
| PUT | `/groups/:groupId/activities/:activityId/interest` | Mark myself in | M |
| DELETE | `…/interest` | Remove myself | M |
| PUT | `…/interest/:userId` · DELETE | Mark/unmark another member | A |
| GET | `…/suggestions?memberIds=&from=&weeks=` | Ranked date suggestions (default members = all "in") | M |
| GET | `/groups/:groupId/occurrences?from=&to=` | Planned occurrences across the group in a range (agenda, availability overlay, conflict flags) | M |
| POST | `…/occurrences` | Plan: `{ date, daypart?, startTime?, participantIds[] }` (must be ⊆ "in" members) → `ACTIVITY_PLANNED` to participants | C, A |
| PATCH | `…/occurrences/:occurrenceId` | Re-date / participants / status planned→done/cancelled (also done→planned to reopen). Notifications are driven by `occurrence_participants.notified_*`: never-notified rows get `ACTIVITY_PLANNED`, rows notified for different date/daypart/time get `ACTIVITY_RESCHEDULED`, cancel sends `ACTIVITY_CANCELLED` to all notified rows | C, A |
| DELETE | `…/occurrences/:occurrenceId` | Remove | C, A |
| GET | `/occurrences/:occurrenceId/ics?token=` | ICS download via signed token (email button, no login) | signed |

## Availability & calendar
| Method | Path | Purpose | Perm |
|---|---|---|---|
| GET | `/groups/:groupId/availability?from=&to=&activityId=` | Day × daypart matrix for group or activity's "in" members; users meta `hasCalendar` | M |
| GET | `/me/availability?from=&to=` | My own computed availability + reasons (calendar/manual/rule) | S |
| GET/PUT/DELETE | `/me/unavailability` (`{ date, daypart }`) | One-off blocks (list in range, add, remove) | S |
| GET/POST/PATCH/DELETE | `/me/unavailability-rules` | Weekly rules | S |
| GET | `/me/calendar` | Connection status, sources, last sync | S |
| GET | `/me/calendar/connect?scope=read|readwrite` | Start provider OAuth (redirect) | S |
| GET | `/calendar/google/callback` | Provider callback → store connection, list calendars, redirect to settings | public (state) |
| DELETE | `/me/calendar` | Disconnect (revoke, delete events/sources) | S |
| PATCH | `/me/calendar/sources/:sourceId` | enable/disable | S |
| POST | `/me/calendar/sync` | Manual sync now (rate limited: 1/5 min) | S |
| GET | `/me/calendar/events?from=&to=` | My own synced events with titles (for ignore rules) | S |
| GET/POST/DELETE | `/me/calendar/ignore-rules` | Ignore by title / series | S |

## Leaderboards
| Method | Path | Purpose | Perm |
|---|---|---|---|
| GET | `/groups/:groupId/leaderboards` | List with my-rank summary | M |
| POST | `/groups/:groupId/leaderboards` | Create | M |
| GET | `/groups/:groupId/leaderboards/:leaderboardId` | Settings + members + editors | M |
| PATCH | `…/:leaderboardId` | Settings (name, description, periods shown, edit mode, editors, sort order) | C, A |
| DELETE | `…/:leaderboardId` | Delete | C, A |
| GET | `…/scores?period=monthly|yearly|total&year=&month=&page=&pageSize=` | Ranked page (cap 500), plus `me` entry with rank | M |
| GET | `…/periods` | Which months/years have data (for pickers) | M |
| POST | `…/members` | `{ userId }` add leaderboard member | M |
| DELETE | `…/members/:memberId` | Remove member (history kept) | E, A |
| PUT | `…/members/:memberId/score` | `{ score }` set (current period only) → monthly/yearly/total + history | E, A |
| DELETE | `…/members/:memberId/score` | Clear current score (history row with new NULL) | E, A |
| GET | `…/history?page=&pageSize=` | Score history | M |

### Dashboard
| Method | Path | Purpose | Perm |
|---|---|---|---|
| GET | `/groups/:groupId/widgets` | Ordered widget list with config (no data; widgets fetch their own) | M |
| POST | `/groups/:groupId/widgets` | `{ type, config }` appended at the end | A |
| PATCH | `/groups/:groupId/widgets/:widgetId` | `{ config }` | A |
| DELETE | `/groups/:groupId/widgets/:widgetId` | Remove | A |
| PUT | `/groups/:groupId/widgets/order` | `{ widgetIds[] }` full order; 422 unless it is a permutation of the group's widgets | A |
| POST | `/groups/:groupId/widgets/restore-defaults` | Appends any default widget type that is missing | A |

## Worker (cron) & internal
| Method | Path | Purpose | Perm |
|---|---|---|---|
| POST | `/worker/calendar-sync` | Sync all active calendar connections (M2) | `X-Worker-Token` |
| POST | `/worker/cleanup` | Nightly cleanup (old events, tokens, states, blocks) | `X-Worker-Token` |
| POST | `/worker/occurrence-reminders` | Day-before reminders (M3) | `X-Worker-Token` |
| GET | `/health` | DB check | public |
| (phase 3) POST/DELETE | `/me/push-subscriptions` | Web push | S |

Pagination contract: every list endpoint shown with `page=` accepts `page` (1-based) and `pageSize` (default 50, max 100); response `{ items, page, pageSize, total, hasMore }`. Leaderboard scores: `total = min(count, 500)`, pages beyond 500 return empty, and the body adds `me: { rank, score } | null`. Range endpoints (`from`/`to`) are capped at 93 days (422 beyond).
