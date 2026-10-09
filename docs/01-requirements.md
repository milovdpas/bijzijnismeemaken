# 01 — Requirements

Confirmed requirements as user stories grouped by feature, preceded by the decisions log from the planning Q&A. Source prompt: [planning-prompt.md](../planning-prompt.md).

## Decisions log


| Topic | Decision |
|---|---|
| Monthly leaderboard | One editable score per user per (year, month). Month picker; past months read-only. |
| Period tables | Always write monthly + yearly + all-time (3 tables). Per leaderboard setting which of the three are shown. |
| Sort order | Per leaderboard `SortOrder` enum `asc` / `desc` (replaces a "higher is better" boolean). Scores are always absolute values. |
| Score write semantics | Write-through: an entry sets the current month, current year and all-time rows to the same value (overwrite, not only-if-better). Absolute values, no increments. |
| Admin override | Owner and admins can always edit/delete scores; history records who did it. |
| Owner leaving | Owner cannot leave. Must transfer ownership or delete the group. Account deletion is blocked while owning a group. |
| Dayparts | morning 08:00–12:00, afternoon 12:00–18:00, evening 18:00–24:00. Europe/Amsterdam, platform-wide. |
| Sessions | JWT access (15 min) + refresh (60 days) like carrefour, delivered as httpOnly cookies on the shared parent domain. |
| FE ↔ API | Separate hosts: app `bijzijn.milovanderpas.nl`, API `api.bijzijn.milovanderpas.nl`. CORS with credentials, cookie `Domain=.bijzijn.milovanderpas.nl`. |
| Email | Brevo (HTTP API) behind a `Mailer` interface. |
| Web push | Phase 3; schema designed now. |
| Who plans | Activity creator + admins/owner. |
| Recurring | Status lives on the occurrence; each planning = one occurrence. |
| Calendars | User picks which of their Google calendars count (default: primary). Sync window today + 180 days. |
| No calendar | Counts as free unless manually blocked; UI shows "no calendar connected" indicator. |
| Manual blocks | One-off (date + daypart) AND weekly rules (weekday + daypart, optional validity range). Self-managed only. |
| Cron | No jobs folder. Each cron job is a `POST /api/v1/worker/<job>` endpoint on a `WorkerController` (carrefour pattern) calling service logic; Ofelia `job-exec` labels in `docker-compose.prod.yml` run a small node script that calls the endpoint with `X-Worker-Token`. |
| Data fetching | TanStack Query + thin typed fetch client; Zustand only for UI preferences. |
| Notifications (MVP) | Group invite, activity planned (to selected participants, with add-to-calendar), new activity in group (opt-out per user). Email only; **no in-app notification inbox / `notifications` table** (pending invites page is the only in-app list). Push (phase 3) reuses the same dispatcher. |
| Suggestions | Next 12 weeks (84 days). |
| Identity | Unique `@handle` (for invites) + free display name + built-in avatar. |
| Occurrence | date + optional daypart + optional start time. |
| Calendar write scope | Incremental consent only when user enables "auto add planned activities to my calendar". |
| Leaderboard members | Any member can add; remove = whoever may edit that leaderboard + owner/admins. |
| Google free/busy | Respect Google's transparency flag: events marked "Free" never block. Skip cancelled, declined, birthday and working-location events; out-of-office and focus-time count as busy. |
| Past planned occurrence | Stays `planned` until creator/admin re-dates it or marks it done; no auto-done (a non-recurring activity may be next year's event). |
| Planned e-mail | Only the selected participants are notified (with add-to-calendar); deselected "in" members are not. Per-participant `notified_at` + the notified values are stored so editing an occurrence only mails new participants (planned) and already-notified ones whose date/daypart/time changed (rescheduled). |
| Email + password (added 2026-10-10) | Second sign-in method beside Google. Verify email before first use (24 h link), forgot/reset via 1 h single-use link that revokes all sessions, one account per email: Google login on a verified password account attaches `google_sub`; on an unverified one it clears the password. Passwords hashed with Node `scrypt`, min 10 chars. Built alongside Google in tasks 7–10. |

---


## 1.1 Users & profiles
- As a visitor I sign in with Google; an account is created on first login (email + google_sub, email counts as verified).
- As a visitor I register with email and password; I get a verification email and can only sign in after clicking it (the link also signs me in). I can ask for the email again.
- As a user I reset a forgotten password through an emailed link (1 h, single use); a successful reset signs out every other session. A Google-only account can use the same flow to add a password.
- As a user I change my password in settings (current password required when one exists).
- One account per email: signing in with Google on an address that already has a verified password account links the two; both methods then work.
- As a new user I complete onboarding: unique handle (3–24 chars, `[a-z0-9_]`), display name, avatar from a fixed set (~16 built-in SVGs), language (nl/en, prefilled from browser).
- As a user I edit profile, language, notification preferences and "auto add planned activities to my calendar".
- As a user I can delete my account (blocked while I own a group; otherwise leaves all groups with the leave rules, deletes calendar data, tokens, user).
- A user can be in many groups.

## 1.2 Groups
- Create group: name, description, access = `public` | `invite_link` | `invite_only`. Creator becomes owner.
- Public groups: listed with search by name; any signed-in user can join.
- Invite link: `APP_URL/join/<slug>-<token>`; the API resolves by token only (slug is cosmetic). Non-expiring; owner/admin can regenerate (invalidating the old one); the token is nulled when access changes away from `invite_link`.
- Invite only: owner/admin invites by `@handle`; invitee gets a notification + in-app pending invite; accepts or declines.
- Roles: owner (1), admin, member. Owner transfers ownership to another member (old owner becomes admin). Owner deletes group.
- Admin: change settings, invite/add/remove members (not owner, not other admins), regenerate link. Owner additionally: promote/demote admins, remove admins, transfer, delete.
- Leave group (admin/member): see 1.6.

## 1.3 Activities
- Any member creates an activity: title, description, image URL, date mode (`none` | `specific` date | `weekday`), optional time, recurring flag, optional extras: location text + maps URL, min/max people, cost per person, duration (minutes), external URL, preferred dayparts (subset of morning/afternoon/evening).
- Edit/delete: creator, admin, owner.
- "I'm in": member toggles own interest; admin/owner can mark others in/out.
- Planning (creator/admin/owner): choose date (+ optional daypart, optional start time), select which "in" members count → creates an occurrence with status `planned`; only the selected participants get notified (with add-to-calendar); re-date and cancel notify participants again. Occurrence can be re-dated, cancelled or marked done.
- Recurring activities get many occurrences; non-recurring at most one open occurrence.
- Derived activity label: `done` (non-recurring, its occurrence is done) · `planned` (any occurrence with status `planned`, regardless of date) · `idea` (otherwise). A planned occurrence whose date has passed is shown as "awaiting confirmation" with re-date / mark done / cancel actions; nothing changes automatically.
- Activity list per group with filters (label, recurring, weekday) and sort (next occurrence, newest).
- No comments/chat.

## 1.4 Availability & planning
- Connect Google Calendar (separate OAuth consent with read scope; may be a different Google account than login). Choose which calendars count.
- Nightly sync stores events (today..+180d) in DB. Other members only ever see busy/free.
- Ignore rules: by exact title (case-insensitive) or by recurring series. Own events list (titles visible to self only) to create rules from.
- Manual unavailability: one-off date + daypart; weekly rule weekday + daypart with optional valid_from/valid_until.
- Group calendar overview: per day × daypart who is free/busy; toggle "whole group" vs "only members in for activity X". Members without calendar flagged.
- Date suggestions on an activity's planning screen: upcoming dates (12 weeks) ranked by number of selected members free.
- Auto-add setting: when enabled (and write scope granted), the API creates an event in the user's primary calendar for occurrences they are part of; stores provider event id for update/cancel.

## 1.5 Leaderboards
- Group has many standalone leaderboards: name, description, score type `number` | `time`, sort order `SortOrder.Desc` (highest first) | `SortOrder.Asc` (lowest first, e.g. fastest time), edit mode `everyone` | `creator` | `selected` (+ list), shown periods flags (monthly/yearly/all-time; at least one).
- Any member adds members to a leaderboard. Remove: editors + owner/admin.
- Score entry (editors per edit mode, always owner/admin): absolute value for a leaderboard member → writes monthly(current y/m), yearly(current y), total. History row with old/new, who, when.
- Views: tabs for enabled periods; month picker (past months read-only, no edits), year picker. Rank list with pagination (page size 50, max 100), capped at top 500.
- History page per leaderboard, paginated, newest first.

## 1.6 Leaving / decoupling
- Leaving member: their activities → `created_by = NULL`, `creator_name_snapshot`, `is_active = false` (hidden from lists, visible to admins in an "inactive" filter) and their open occurrences are cancelled with participants notified (M2: auto-added provider events deleted); interests and participations removed; leaderboard membership rows → `user_id = NULL` with `display_name_snapshot`; history `changed_by` decoupled the same way; editor rows and pending invites removed.
- Owner cannot leave (409 with code `OWNER_MUST_TRANSFER`).

## 1.7 Notifications (MVP email only; push phase 3; no in-app inbox)
- `GROUP_INVITE` (invitee), `ACTIVITY_PLANNED` / `ACTIVITY_RESCHEDULED` / `ACTIVITY_CANCELLED` (selected participants only), `ACTIVITY_CREATED` (all group members except the creator). Per-user email toggle per type.
- Email in user's locale, "Add to calendar" button (ICS download via signed link + Google Calendar template link).

## 1.8 Out of scope (for now)
Image uploads, comments/chat, app-store apps, Apple/Outlook calendar (abstraction only), push notifications in MVP, multi-timezone, group avatars, activity polls/voting, score increments, real-time updates, admin backoffice, rate-limited public API, frontend tests.
