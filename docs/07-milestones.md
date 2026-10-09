# 07 — Milestone plan

Each task is sized for one implementation session and one review. Progress is tracked in [PROGRESS.md](PROGRESS.md).

Backend tasks include vitest integration tests in the dynamic_alarm style.

## M0 — Foundation (repo skeleton)
1. Root workspace: **copy** dynamic_alarm root files (package.json, tsconfig.base, tsconfig, eslint base, prettier, editorconfig, gitignore, docker-compose.yml, docker-compose.prod.yml, deploy workflow), drop the custom eslint plugin, rename `alarm` → `bzim`, add mailpit to `docker-compose.yml`. Verify `npm install` works.
2. `packages/types`: **copy** the dynamic_alarm package shell, empty the alarm content, add `API_ENDPOINTS` (health + placeholders), `ERROR_CODES`, enums (Daypart, Weekday, GroupAccess, GroupRole, DateMode, OccurrenceStatus, ScoreType, SortOrder, EditMode, LeaderboardPeriod, NotificationType), `DAYPARTS` ranges, avatar keys. Verify `npm run build:packages`.
3. `apps/api`: **copy** the dynamic_alarm API per the list in [02-architecture.md](02-architecture.md) section 2.3, strip all alarm domain code/tests/migrations, rename, make it boot against the local MySQL, run `migrate` on an empty DB, pass the copied `health.test.ts`, lint and type-check. No new features in this task.
4. `apps/web` skeleton: Next.js App Router, Tailwind v4 + shadcn (Base UI), i18n (en/nl typed dicts + key test), QueryProvider, theme, `lib/api/client.ts`, Dockerfile (standalone), `/health`.
5. CI: `deploy-api.yml`, `deploy-web.yml`, `docker-compose.prod.yml`; lint/type-check/test workflow on PR.

## M1 — MVP
6. Migration + entities: users, refresh_tokens, oauth_states.
7. Auth core: `JWT` util, cookie helpers, `UserAuth` middleware, refresh rotation + family revocation, logout, CORS + `OriginCheck`. Tests mint tokens directly.
8. Google login: redirect with state table, callback with mocked `id_token` verification, user upsert, onboarding redirect.
9. Users API: `GET/PATCH /me`, `handle-available`, `users/search`, `DELETE /me` (409 for owners now; full deletion in task 30).
10. Web: login page, `AuthGate`, `useMe`, onboarding (handle/display name/avatar/locale), settings profile card.
11. Migration + entities: groups, group_members, group_invites. `GroupService`, `MembershipService`, `requireGroupRole`.
12. Groups API: create, my groups, public search, detail, update, delete, join (public/link), invite link regenerate.
13. Members API: list, role change, remove, transfer ownership, leave (membership + invites + editors only; activity/leaderboard decoupling is task 29).
14. Invites API + `NotificationService` (stateless dispatcher: resolves recipients + preferences, calls channels) + `Mailer` (Console + Brevo) + invite email template.
15. Web: groups list, create group, public search, join link page, group shell with nav (activities / availability / leaderboards / members / settings).
16. Web: members management, invites UI (send by handle, pending list, my invites page with accept/decline), group settings.
17. Migration + entities: activities, activity_interests, activity_occurrences, occurrence_participants (no calendar columns yet). `ActivityService`, derived label logic (unit-tested).
18. Activities API: CRUD, interest endpoints (self/others), list filters, "new activity" email.
19. Occurrences API: plan / re-date / done / cancel, group occurrences range endpoint, ICS endpoint with signed token, "activity planned" email with add-to-calendar.
20. Web: activity list with filters, activity form (all fields, preferred dayparts).
21. Web: activity detail (interest, occurrences), planning dialog (date/daypart/time/participants) without suggestions yet.
22. Migration + entities: manual_unavailability, weekly_unavailability_rules. `AvailabilityService` (manual-only path) + `/me/availability`, `/groups/:id/availability`.
23. Web: my availability editor (month grid × dayparts, weekly rules).
24. Web: group availability overview (group / activity-in toggle, no-calendar indicator, planned occurrences overlay).
25. Suggestions endpoint + planning dialog integration (ranked list, select/deselect "in" members).
26. Migration + entities: leaderboards, editors, members, 3 score tables, history. `LeaderboardService` (settings, members, editors, permission checks).
27. `ScoreService` (write-through to current month/year/total, history, no-op on equal) + `ScoreQueryService` (ranked pages, cap 500, consistent tie-break, periods list). Leaderboards API + tests.
28. Web: leaderboards list, create/edit dialog, members management; board view with period tabs, month/year pickers, pagination, my rank; score entry dialog (number / hh:mm:ss.SSS input); history page. (Split into 2–3 sessions as needed: list+settings, board+entry, history.)
29. Leave-group decoupling: activities inactive + open occurrences cancelled, leaderboard member decoupling, tests.
30. Account deletion (full order from section 3) + settings "danger zone".
31. PWA: manifest, icons, sw.js, service worker registration, `useInstallApp`, install card + one-time prompt.
32. `CleanupService` + `POST /worker/cleanup` (`WorkerController`, `WorkerAuth`, `tools/worker.ts`) + Ofelia labels; deploy to VPS; DNS, proxy, certs, Google OAuth redirect URIs; smoke test.

## M2 — Google Calendar
33. Migrations + entities: calendar_connections, calendar_sources, calendar_events, calendar_ignore_rules; `ALTER TABLE occurrence_participants ADD calendar_connection_id`. `Crypto` (AES-GCM) util.
34. `CalendarProvider` interface + `GoogleCalendarProvider` (connect URL, code exchange, list calendars, list events with `singleEvents` + sync filters, refresh token, revoke) + fixture provider for tests.
35. Connect/callback/disconnect endpoints, sources toggle, manual sync endpoint.
36. `CalendarSyncService` + `POST /worker/calendar-sync` (per connection, per enabled source, window today..+180d, replace-in-window transaction, error states) + Ofelia label.
37. Ignore rules endpoints + own events listing; `AvailabilityService` calendar path + tests (overlap edge cases, all-day, DST, transparency).
38. Web: calendar settings page (connect, pick calendars, status/reauth banner, sync now), my events list with "ignore title / ignore series" actions; availability views now show calendar-derived busy.
39. Auto-add setting: incremental write-scope consent flow, create/update/delete provider events on occurrence plan/re-date/cancel (and on decoupling/deletion) for participants with the setting on; store ids on `occurrence_participants`.

## M3 — Notifications & polish
40. Web push: `push_subscriptions`, VAPID keys, `web-push`, subscribe UI in settings, sw `push`/`notificationclick`, `PushChannel` in dispatch, per-type preferences UI.
41. `POST /worker/occurrence-reminders` (day-before reminder to participants), notification preferences for it.
42. Offline/UX polish: skeletons, empty states, error toasts by code, `HydrationGate`, optimistic interest toggles.
43. Operational: backup note for external MySQL, log review, rate-limit tuning, Dependabot config.

## M4 — Later ideas (not committed)
Apple/CalDAV provider, group avatars, activity polls, export leaderboards, admin impersonation for support.
