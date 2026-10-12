# 07 — Milestone plan

Each task is sized for one implementation session and one review. Progress is tracked in [PROGRESS.md](PROGRESS.md).

Backend tasks include vitest integration tests in the dynamic_alarm style.

## M0 — Foundation (repo skeleton)
1. Root workspace: **copy** dynamic_alarm root files (package.json, tsconfig.base, tsconfig, eslint base, prettier, editorconfig, gitignore, docker-compose.yml, docker-compose.prod.yml, deploy workflow), drop the custom eslint plugin, rename `alarm` → `bzim`, add mailpit to `docker-compose.yml`. Verify `npm install` works.
2. `packages/types`: **copy** the dynamic_alarm package shell, empty the alarm content, add `API_ENDPOINTS` (health + placeholders), `ERROR_CODES`, enums (Daypart, Weekday, GroupAccess, GroupRole, DateMode, OccurrenceStatus, ScoreType, SortOrder, EditMode, LeaderboardPeriod, NotificationType), `DAYPARTS` ranges, avatar keys. Verify `npm run build:packages`.
3. `apps/api`: **copy** the dynamic_alarm API per the list in [02-architecture.md](02-architecture.md) section 2.3, strip all alarm domain code/tests/migrations, rename, make it boot against the local MySQL, run `migrate` on an empty DB, pass the copied `health.test.ts`, lint and type-check. No new features in this task.
4. `apps/web` skeleton: Next.js App Router, Tailwind v4 + shadcn (Base UI), i18n (en/nl typed dicts + key test), QueryProvider, theme, `lib/api/client.ts`, Dockerfile (standalone), `/health`.
4b. Design pass (added after review of task 4): visual direction (playful, minimal; yellow brand with a deep blue ink), tokens for light and dark, rounded typography, app shell (desktop top bar, mobile bottom nav), theme toggle, logo mark, `EmptyState` and `PageHeader` action slot, `docs/11-design.md` describing the system. No feature screens.
5. CI: `deploy-api.yml`, `deploy-web.yml`, `docker-compose.prod.yml`; lint/type-check/test workflow on PR.

## M1 — MVP
6. Migration + entities: users, refresh_tokens, oauth_states.
7. Auth core: `JWT` util, cookie helpers, `UserAuth` middleware, refresh rotation + family revocation, logout, CORS + `OriginCheck`. Tests mint tokens directly.
8. Google login (redirect with state table, callback with mocked `id_token` verification, user upsert or link by email, onboarding redirect) + email/password register and login (`Password` util with scrypt, `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, login rate limits).
8b. Verification and reset: `Mailer` interface + `ConsoleMailer` + `BrevoMailer` (pulled forward from task 14), `email_tokens` service, `verify-email`, `resend-verification`, `forgot-password`, `reset-password` endpoints and their nl/en templates.
9. Users API: `GET/PATCH /me`, `PATCH /me/password`, `handle-available`, `users/search`, `DELETE /me` (409 for owners now; full deletion in task 30).
10. Web: login page (Google button + email/password form, register, forgot password), `/verify-email` and `/reset-password` pages, `AuthGate`, `useMe`, onboarding (handle/display name/avatar/locale), settings profile + password cards.
11. Migration + entities: groups, group_members, group_invites. `GroupService`, `MembershipService`, `requireGroupRole`.
12. Groups API: create, my groups, public search, detail, update, delete, join (public/link), invite link regenerate.
13. Members API: list, role change, remove, transfer ownership, leave (membership + invites + editors only; activity/leaderboard decoupling is task 29).
14. Invites API + `NotificationService` (stateless dispatcher: resolves recipients + preferences, calls channels) + invite email template (the Mailer itself lands in 8b).
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
28. Web: leaderboards list, create/edit dialog, members management; board view with period tabs, month/year pickers, pagination, my rank; score entry dialog (number / hh:mm:ss.SSS input) and +1 / −1 steppers when `showSteppers` is on; history page. (Split into 2–3 sessions as needed: list+settings, board+entry, history.)
    28c. Timer tab on a time leaderboard: a third tab beside Ranking and Players, one stopwatch on the device that starts on a tap of the readout and stops on the next, with laps, reset, and "save as score" opening the add-score flow with that time prefilled. Counting up only, one person at a time, no server state. Decided and built 2026-10-10.
    28b. Group dashboard: `group_widgets` migration + entity, seeding on group creation, widget endpoints (list, add, update, remove, reorder, restore defaults) with per-type zod configs, cleanup when a leaderboard or activity is deleted, tests. Web: dashboard as the group root and first tab (`upcoming`, `ideas`, `leaderboard`, `note`, `activity`, `link` widgets), admin edit mode (add sheet, config dialogs, reorder with drag on desktop and up/down buttons on phones). Split into API and web sessions.
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
    38b. Onboarding, extended: after profile and language, two skippable steps, "connect your Google Calendar" (the task 38 connect flow, then pick calendars) and "when are you usually busy?" (the task 23 week grid for weekly rules). A "finish your setup" card on the groups page for people who skipped either, dismissable. `users.onboarding_steps_done` or a per-step timestamp so the card knows. Decided 2026-10-10.
39. Auto-add setting: incremental write-scope consent flow, create/update/delete provider events on occurrence plan/re-date/cancel (and on decoupling/deletion) for participants with the setting on; store ids on `occurrence_participants`.

## M3 — Notifications & polish
40. Web push: `push_subscriptions`, VAPID keys, `web-push`, subscribe UI in settings, sw `push`/`notificationclick`, `PushChannel` in dispatch, per-type preferences UI.
41. `POST /worker/occurrence-reminders` (day-before reminder to participants), notification preferences for it.
42b. Generated avatars: DiceBear styles (public-domain ones), style + seed per person, picker with shuffle; replaces or extends the sixteen icon tiles. Parked 2026-10-10.
42. Offline/UX polish: skeletons, empty states, error toasts by code, `HydrationGate`, optimistic interest toggles.
43. Operational: backup note for external MySQL, log review, rate-limit tuning, Dependabot config.
44. Tools tab on the group page: a tab (after leaderboards) listing small helpers for an evening, each a self-contained feature folder under `components/tools/<tool>/` with its pure logic in `lib/tools/<tool>.ts` (tested) and a registry in `lib/tools.ts` (key, icon, label, component) so adding a tool is one entry. A tool runs on one device and keeps its state in `localStorage` (resume after a reload; no server state, no live sharing). First three: a score tracker (any number of players, +/− entries that each go into a correctable history, running totals, no modes), a darts scorer (501/301 with a double-out toggle, per-turn input, bust handling and checkout hints; plus around the clock; no cricket) and a Yahtzee sheet (the thirteen categories per player, upper bonus, Yahtzee bonus for extra Yahtzees, totals). Every tool can end a game early (the scores as they stand decide) or cancel it (the scores go, the players stay). No hand-off to a leaderboard: a game's result stays in the tool (task 49 later added a sole winner's win onto a private board). More tools come as separate tasks. One of the last things in the project. Decided 2026-10-10.

## M4 — Tournaments
45. Migration + entities (`tournaments`, `tournament_entries`, `tournament_entry_members`, `tournament_matches`), `ActivityCategory.TOURNAMENT`, and the pure logic in `domain/tournaments/`: knockout pairing with byes, group round-robin pairing, standings order, advancing from groups; unit-tested.
46. Tournaments API: list (running / archive), create (optionally from a `tournament` activity), settings while draft, entries (player, guest, team), draw (shuffle; random teams), start, results (a side's member or the organiser/admins; clearing by organiser/admins), advance, finish; detail with standings; tests.
47. Web: Tournaments tab (seventh group tab), list with running and archive, create form (format, players or teams with team size, win/draw points, groups and advancing count, third place), draft screen: entries (member, guest, team builder by hand or random), seeding and groups with drag on desktop and up/down on phones, start.
48. Web: running and finished views: bracket (rounds as columns, scrollable on phones), group tables with standings, result dialog for one's own match and for the organiser, advance and finish, winner banner, archive detail read-only; the activity detail of a `tournament`-category activity gets "create tournament" and a link to it.

## M5 — Later ideas (not committed)
49. Private leaderboards (decided 2026-10-12): a normal leaderboard with `is_private`, chosen at creation with the people on it (the creator and up to 7 others, guests included). Only they see it, admins and owner included (404 for anybody else), and it is never on the dashboard. Everybody on it manages it and enters scores; the last person with an account stays on it, and the board goes when the last of them leaves the group. A step endpoint (`POST …/score/step`) adds one in month, year and all time at once, which the plus and minus buttons now use on every board. The darts and score tools can add a sole winner's win to one that has everybody from the game on it (matched by name). First raised as 1v1 boards on 2026-10-10 while deciding the tools tab, so the group's leaderboards page does not fill with a pair's tallies; the web lists them in their own "Private" section.

Apple/CalDAV provider, group avatars, activity polls, export leaderboards, admin impersonation for support.
