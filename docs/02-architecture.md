# 02 — Architecture overview


## 2.1 Monorepo layout (npm workspaces, as dynamic_alarm)
```
bijzijnismeemaken/
  package.json                 workspaces: ["packages/*", "apps/*"], scripts: dev, build, test, lint, type-check, build:packages
  tsconfig.base.json           strict, noUncheckedIndexedAccess, noImplicitOverride, ES2022
  eslint.config.base.mjs       typescript-eslint recommendedTypeChecked (no-floating-promises etc.)
  .prettierrc                  4 spaces, single quotes, semicolons, width 100, trailing commas
  docker-compose.yml           local MySQL 8 (utf8mb4, time zone +00:00, host port 3308) + mailpit (SMTP 1025, UI 8025)
  docker-compose.prod.yml      api + web services, web network, expose only, healthchecks, ofelia labels
  .github/workflows/ci.yml (lint, type-check, test, web build on PRs and main), deploy-api.yml, deploy-web.yml
  apps/api/                    Express 5 + TypeORM + Knex migrations (see 2.3)
  apps/web/                    Next.js (App Router) PWA (see 2.4)
  packages/types/              @bzim/types: DTOs, API_ENDPOINTS, ERROR_CODES, enums (Daypart, Role, …), constants (DAYPARTS ranges), tiny pure helpers both apps must agree on (`slugify`)
  docs/                        the planning docs produced by this plan
  AGENTS.md                    conventions summary for AI/human contributors
```
Package scope name: `@bzim/*` (bij zijn is meemaken). Shared package built with `tsc -b` to `dist/` before apps type-check.

## 2.2 Conventions carried over from `dynamic_alarm/apps/api`
- `createApp()` separate from `index.ts`; connect DB before listen; graceful shutdown; `/api/v1/health` does a real `SELECT 1`.
- Route group classes implementing `IRoute`; one line per route: path constant from `API_ENDPOINTS`, auth middleware, rate limit, `validate({ params, query, body })`, controller arrow handler typed `Handler<BodyOf<schema>, Params>`.
- zod v4 schemas in `app/validators/*Schemas.ts`; `validate()` reports all issues → 422 `VALIDATION_FAILED`; parsed query/params on `req.validatedQuery` / `req.validatedParams`.
- Controllers render; services never touch `res`. Services return `Entity | null` or result unions `{ ok: true, … } | { ok: false, problem: '…' }`; controller maps problems via exhaustive switch.
- Responses: bare resource / bare array (lists with pagination use `{ items, page, pageSize, total, hasMore }`); errors flat `{ code, message, details? }` with `code` from `ERROR_CODES`. 404 for resources the caller may not see, 403 only for known-but-forbidden group actions.
- `utils/ApiResponses.ts` helpers (`sendSuccess<T>`, `sendNotFound`, `sendForbidden`, `sendConflict`, `sendValidationFailed`), one last-resort `ErrorHandler`.
- TypeORM active-record entities `*.entity.ts` with explicit entity list, `synchronize: false`, UUID PKs generated in app, `datetime(3)` UTC, `decimalTransformer`; `toDto()` per entity.
- Knex migrations in `database/migrations/YYYYMMDDHHMMSS_name.ts` run via `tools/migrate.ts` (latest/rollback/status); migrations are the source of truth for indexes/uniques.
- Config: dotenv + `required()/optional()/integer()/flag()` helpers in `config/app.ts`, fail fast; `.env.example`, `.env.test.example`, `.env.dist` committed.
- Hand-rolled in-memory rate limiter + `ApiLimits.ts` names.
- Tests: vitest + supertest against a real `*_test` MySQL DB; `globalSetup` migrates, `beforeEach` truncates, `fileParallelism: false`; `tests/support/{client,factories,database}.ts`; external providers mocked with `vi.spyOn(Factory, 'for')`.
- Logging: plain `console` with a tiny `Logger` wrapper (level prefix); no pino.
- Docker: multi-stage `node:22-alpine`, repo-root build context, non-root user, `HEALTHCHECK` against `127.0.0.1`.

Deliberate deviations (added in the task that first needs them, never in the bootstrap task): `cors` (credentials) and `cookie-parser`; `jsonwebtoken`; `googleapis` (or `google-auth-library` + REST); `luxon`; a `WorkerController`; group-scoped authorization middleware (`requireGroupRole`).

## 2.3 apps/api structure

**Bootstrapping rule: copy the dynamic_alarm boilerplate, then strip and rename. Do not rewrite it.**

Copy verbatim from `C:\Users\milov\PersonalProjects\dynamic_alarm` (then adjust names):
- Root: `package.json` (workspaces + scripts), `tsconfig.base.json`, `tsconfig.json`, `eslint.config.base.mjs`, `.prettierrc`, `.editorconfig`, `.gitignore`, `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/deploy-api.yml`. Drop `tools/eslint-plugin-alarm` (project-specific).
- `packages/types`: `package.json`, `tsconfig.json`, `src/index.ts` structure, `constants.ts` shape (`API_ENDPOINTS`, `ERROR_CODES`), `api.ts`/`enums.ts`/`domain.ts` as empty shells. Drop all alarm-specific content. Skip `packages/core` (not needed yet).
- `apps/api`: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.mjs`, `vitest.config.ts`, `Dockerfile`, `.dockerignore`, `.env.example`, `.env.test.example`, `.env.dist`, `src/index.ts`, `src/app.ts`, `src/config/{app,database}.ts`, `src/database/{typeorm-db,knexfile}.ts`, `src/interfaces/{IHttp,IRouter}.ts`, `src/app/routes/{index,api}.ts`, `src/app/middleware/{ErrorHandler,NotFound,ValidateRequest,RateLimit,ApiLimits,MonitorAuth}.ts`, `src/app/validators/commonSchemas.ts`, `src/app/utils/{ApiResponses,ColumnTransformers,Token}.ts`, the health route/controller, `tools/migrate.ts`, `src/tools/monitorTick.ts` (becomes `tools/worker.ts`), `tests/{globalSetup,setup}.ts`, `tests/support/{client,database,factories}.ts` (factories emptied), `tests/health.test.ts`.
- Strip: every alarm domain file (`Place*`, `Schedule*`, `Commute*`, `Routine*`, `Device*`, NS/TomTom modules, their routes, controllers, services, entities, validators, migrations, tests, smoke tools), `DeviceAuth` (replaced by `UserAuth`), `apps/mobile` entirely.
- Rename: `@alarm/*` → `@bzim/*`, `alarm`/`dynamic_alarm` identifiers and DB names → `bzim`, `MONITOR_TOKEN`/`monitorAuth` → `WORKER_TOKEN`/`workerAuth`, `monitor/tick` → `worker/<job>`, `req.device` → `req.user`.
- Improve only after it runs: first make the copied skeleton boot, migrate an empty DB, pass `health.test.ts`, lint and type-check; then apply improvements (cookie-parser, cors, jsonwebtoken, Logger wrapper, worker routes) as part of the tasks that need them.

Resulting structure (new files marked with `+`, everything else is copied/renamed):
```
src/
  index.ts, app.ts
  config/{app,database,security,dayparts}.ts
  database/{typeorm-db,knexfile}.ts, database/migrations/
  interfaces/{IHttp,IRouter}.ts
  app/routes/index.ts, api.ts, groups/{health, +auth, +users, +groups, +invites, +activities, +occurrences, +availability, +calendar, +leaderboards, worker(renamed monitor)}.ts
  app/controllers/*Controller.ts            (+ one per route group)
  app/services/*Service.ts                  (+ Auth, User, Group, Membership, Invite, Activity, Occurrence, Availability, Suggestion, Calendar, CalendarSync, IgnoreRule, Leaderboard, Score, ScoreQuery, Notification, Job)
  app/models/*.entity.ts                    (+ all new)
  app/middleware/{+UserAuth, +RequireGroupRole, ValidateRequest, ErrorHandler, NotFound, RateLimit, ApiLimits, +OriginCheck, WorkerAuth(renamed MonitorAuth)}.ts
  app/validators/{commonSchemas, +*Schemas}.ts
  +app/modules/calendar/{CalendarProvider.ts,GoogleCalendarProvider.ts,CalendarProviderFactory.ts}
  +app/modules/mail/{Mailer.ts,BrevoMailer.ts,ConsoleMailer.ts,templates/{nl,en}.ts}
  +app/presenters/*Presenter.ts            (composed response shapes; entities keep toDto for their own columns)
  app/utils/{ApiResponses, ColumnTransformers, Token, +JWT, +Crypt, +Normalize, +Database, +Pagination}.ts
  tools/migrate.ts, src/tools/worker.ts (renamed monitorTick; under src so it compiles into dist/tools for the Ofelia label)
tests/ (copied globalSetup/setup/support; flat *.test.ts per feature added with each task)
```

## 2.4 apps/web structure (Next.js App Router, conventions from marathon_schema)
```
app/
  layout.tsx (ThemeProvider, ServiceWorker, fonts), manifest.ts, globals.css
  (public)/login/page.tsx, join/[token]/page.tsx
  (app)/layout.tsx → AppRuntime (I18nProvider, QueryProvider, AuthGate, Toaster)
  (app)/onboarding, (app)/groups, (app)/groups/[groupId] (dashboard), (app)/groups/[groupId]/{activities,activities/[activityId],availability,leaderboards,leaderboards/[leaderboardId],leaderboards/[leaderboardId]/history,members,settings}, (app)/availability (my availability: week schedule + month), (app)/settings, (app)/settings/calendar, (app)/invites
components/
  ui/ (shadcn Base UI primitives, generated)   common/ (Field, PageHeader, EmptyState, Avatar, InstallInstructions, Pagination)
  layout/ (AppNav, AppRuntime, I18nProvider, ServiceWorker, ThemeToggle)
  groups/, activities/, availability/, leaderboards/, settings/, onboarding/   (feature folders, *-view.tsx top-level, feature hooks beside components)
lib/
  api/client.ts (fetch wrapper: credentials include, ApiError(code,status,details), single-flight refresh on 401)
  api/{auth,users,groups,invites,activities,occurrences,availability,calendar,leaderboards}.ts (typed functions using @bzim/types)
  i18n/{index.ts,locales/{en,nl}.ts}  (nl: Dict typing, key test)
  format-date.ts (Luxon, Amsterdam zone), dayparts.ts (pure helpers for grid), avatars.ts, utils.ts (cn)
  query-keys.ts
hooks/
  queries/use-*.ts (useQuery/useMutation wrappers + invalidation), use-install-app.ts, use-mounted.ts, use-me.ts, use-group-role.ts
store/ use-preferences-store.ts (locale, theme, installPromptSeen) — Zustand persist
public/ sw.js, icons/ (png 192/512/maskable), avatars/*.svg
```

## 2.5 Auth flow (Google OAuth → JWT cookies)
1. `GET /api/v1/auth/google?returnTo=` → `returnTo` must be a relative path (`/…`, never `//`), stored with a random state in `oauth_states` (10 min) and mirrored in an `oauth_state` cookie; redirects to Google (`openid email profile`, `prompt=select_account`).
2. `GET /api/v1/auth/google/callback` → verify state, exchange code, verify `id_token` (`google-auth-library`), upsert user by `google_sub` (fallback match by verified email), issue token pair, set cookies, redirect to `APP_URL/onboarding` (if no handle yet) or `returnTo`.
3. Cookies: `access_token` (JWT `{ sub, type:'access' }`, 15 min) and `refresh_token` (JWT `{ sub, type:'refresh', jti }`, 60 days). Both `HttpOnly; Secure; SameSite=Lax; Path=/`, host-only on the API hostname (no `Domain`: the app and API are sibling hostnames, and a same-site Lax cookie reaches the API without one). Refresh token `jti` + sha256 hash stored in `refresh_tokens` for rotation/revocation (carrefour issues stateless refresh tokens; we add the table so logout and account deletion actually revoke).
4. `UserAuth` middleware: read `access_token` cookie (or `Authorization: Bearer` for tests/tools), `JWT.verify`, reject `type !== 'access'`, load user → `req.user`. Missing/expired → 401 `UNAUTHENTICATED`.
5. `POST /api/v1/auth/refresh`: verify refresh cookie, check row not revoked/expired, rotate (revoke old, insert new), set both cookies. Reuse of a revoked token → revoke whole family, 401.
6. `POST /api/v1/auth/logout`: revoke, clear cookies.
7. Frontend `lib/api/client.ts`: on 401 → one shared in-flight `refresh()` → retry once → else redirect to `/login`.
8. CSRF: SameSite=Lax + `OriginCheck` middleware on non-GET requests authenticated by cookie (Origin/Referer must equal `APP_URL`); skipped for `Authorization: Bearer` requests and `/internal/*`. CORS: `origin: APP_URL, credentials: true`.
9. Local dev: app `http://localhost:3000`, API `http://localhost:4000`; cookies without Domain attribute, `Secure` off when not production.
10. Email + password (same cookies, same refresh rows): `POST /auth/register` creates the user with `password_hash` (Node `crypto.scrypt`, N=2^15 r=8 p=1, 16-byte salt, stored as `scrypt$N$r$p$salt$hash`) and `email_verified_at = NULL`, then emails a verification link (`email_tokens` row, purpose `verify_email`, 24 h). `POST /auth/login` refuses an unverified account with `EMAIL_NOT_VERIFIED`; wrong email or password is one generic `INVALID_CREDENTIALS`, rate limited by address and by email. `POST /auth/verify-email` consumes the token, sets `email_verified_at`, issues the token pair. `POST /auth/forgot-password` always answers 204 and, if the email exists, emails a reset link (purpose `reset_password`, 1 h, single use); `POST /auth/reset-password` sets the hash, marks the email verified and revokes every refresh token of the user. Google login on an existing email: verified → attach `google_sub`; unverified → attach, mark verified and clear `password_hash`, so an address cannot be pre-claimed by someone who does not own it. The web app handles `/verify-email?token=` and `/reset-password?token=` pages that call these endpoints.

## 2.6 Calendar provider abstraction
```ts
interface CalendarProvider {
  readonly key: 'google';
  getConnectUrl(state: string, scopes: 'read' | 'readwrite'): string;
  exchangeCode(code: string): Promise<{ refreshToken: string; accessToken: string; expiresAt: Date; accountEmail: string; grantedScopes: string[] }>;
  refreshAccessToken(conn: CalendarConnection): Promise<{ accessToken: string; expiresAt: Date }>;
  listCalendars(conn): Promise<ProviderCalendar[]>;                 // id, name, primary, timeZone
  listEvents(conn, calendarId, from: Date, to: Date): Promise<ProviderEvent[]>; // id, recurringEventId, title, start, end, allDay, status
  createEvent(conn, calendarId, input: EventInput): Promise<string>; // returns provider event id
  updateEvent / deleteEvent(conn, calendarId, providerEventId)
  revoke(conn): Promise<void>;
}
```
`CalendarProviderFactory.for(key)`; services only use the interface. Google impl uses `googleapis` with `singleEvents: true` (expands recurrences, keeps `recurringEventId`), `timeMin/timeMax`, paging. Connect URL uses `access_type=offline`, `prompt=consent`, `include_granted_scopes=true` (needed for the incremental write scope and to guarantee a refresh token). The calendar callback requires the access cookie and checks `oauth_states.user_id === req.user.id` before storing the connection (prevents attaching a stranger's calendar via a crafted link). Disconnect revokes at Google so a reconnect yields a fresh refresh token. Refresh tokens encrypted at rest with AES-256-GCM (`CALENDAR_TOKEN_KEY`, 32 bytes base64). `invalid_grant` → connection status `reauth_required` + in-app banner.

## 2.7 Scheduled jobs (worker endpoints + Ofelia)
- There is **no jobs folder**. Cron work is exposed as worker endpoints on a `WorkerController` (carrefour pattern): `POST /api/v1/worker/calendar-sync` (daily 00:05 Amsterdam), `POST /api/v1/worker/cleanup` (daily 00:30), later `POST /api/v1/worker/occurrence-reminders`. The controller only orchestrates; the logic lives in the normal services (`CalendarSyncService.syncAll()`, `CleanupService.run()`).
- Worker routes live in `app/routes/groups/worker.ts` behind `WorkerAuth` (`X-Worker-Token` shared secret, `timingSafeEqual`, 503 if unset). A static in-process "running" flag per endpoint prevents overlap (409 `WORKER_BUSY` while running). Each answers `{ job, durationMs, stats }`.
- `tools/worker.ts <job>` is the small fetch client Ofelia executes inside the container (dynamic_alarm `monitorTick` renamed): labels on the `api` service in `docker-compose.prod.yml`:
  `ofelia.job-exec.bzim-calendar-sync.schedule: "0 5 23 * * *"`, `…command: "node dist/tools/worker.js calendar-sync"`. Schedules are in the scheduler container's timezone (UTC on the VPS) → write them in UTC and document the DST offset (midnight Amsterdam = 22:00/23:00 UTC); simplest: run at `0 5 23 * * *` UTC (00:05 or 01:05 Amsterdam) and let the job compute "today" in Amsterdam time.
- Runbook note: after a deploy that adds/changes labels, `docker restart scheduler` and verify `job registered` lines.
- Cleanup: delete `calendar_events` with `end_at < now - 1d`; expired/revoked `refresh_tokens` older than 30 d; `oauth_states` older than 1 h; manual one-off blocks older than 90 d.

## 2.8 Notification flow
`NotificationService.notify(userIds, type, payload)` is a stateless dispatcher (no notifications table): it asks `NotificationSettingService` which recipients take that type on each channel (`notification_settings` rows, default email on / push off) and, for each, calls `Mailer.send(templateKey, locale, data)`. Per-recipient "already sent" state lives on the domain row that needs it (`occurrence_participants.notified_*`); invites and new-activity mails are sent exactly once at creation. `BrevoMailer` (HTTP API, `BREVO_API_KEY`, sender `noreply@milovanderpas.nl`), `ConsoleMailer` in dev/tests. Templates are TS functions returning `{ subject, html, text }` per locale. Sending is awaited but failures are logged, never fail the request (fire-and-forget with `void` + catch). Phase 3 adds `PushChannel` using the same dispatch.

## 2.9 i18n
- Web: i18next + react-i18next as marathon_schema; `lib/i18n/locales/en.ts` is the typed source (`Dict`), `nl.ts: Dict`; key-existence test; locale = user profile (synced to server) with browser detection fallback and `document.documentElement.lang`.
- API: error responses carry codes only; FE translates. Emails use `user.locale` with `apps/api/src/app/modules/mail/templates/{nl,en}.ts`.
- Dates: Luxon with `Settings.defaultZone = Europe/Amsterdam` and the active locale, set by `I18nProvider`; daypart labels translated.

## 2.10 PWA
- `app/manifest.ts` (frozen `id: '/'`, `start_url: '/groups'`, standalone, PNG icons 192/512/maskable), `appleWebApp` metadata, `viewport.themeColor`.
- `public/sw.js` hand-written: network-first for navigations with `/groups` offline fallback, cache-first for `/_next/static` and `/icons`, never touches `api.` origin. Registered in production after `load`.
- `useInstallApp()` + `InstallAppCard` in settings + one-time prompt, both using shared `InstallInstructions` (fix the duplication noted in marathon_schema).
- Phase 3: `push` + `notificationclick` handlers in `sw.js`.

## 2.11 Deployment (follows vps_hosting docs)
- Two images: `milovdpas8/bzim-api` (node `dist/index.js`, `/api/v1/health`) and `milovdpas8/bzim-web` (Next `output: 'standalone'`, copy `.next/static` + `public`, `NEXT_PUBLIC_API_URL` build arg, `/health` route).
- `docker-compose.prod.yml` with both services on the external `web` network, `expose` only, healthchecks, `env_file: .env` for api, Ofelia labels on api.
- External MySQL (no DB on the VPS); deploy workflow runs `npm run migrate` in the api container after `up -d` (as dynamic_alarm).
- Deploy order: the API workflow renders `/opt/apps/bzim/.env` from `apps/api/.env.dist` and the compose file reads `DOCKERHUB_USERNAME` from it, so the API must deploy at least once before the web workflow can. Each workflow pulls and restarts only its own service. CI (`ci.yml`) is the only place lint/type-check/tests run; the deploy workflows do not repeat them.
- The workflow files are kept untracked until the VPS side (secrets, proxy confs, DNS, Google OAuth redirect URIs) is set up, because pushing them to `main` starts deploys.
- Proxy confs + certs for both hostnames; Google OAuth redirect URIs registered for prod + localhost.
