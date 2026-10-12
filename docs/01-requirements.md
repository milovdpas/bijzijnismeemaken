# 01 — Requirements

Confirmed requirements as user stories grouped by feature, preceded by the decisions log from the planning Q&A. Source prompt: [planning-prompt.md](../planning-prompt.md).

## Decisions log


| Topic | Decision |
|---|---|
| Monthly leaderboard | One editable score per user per (year, month). Month picker; past months read-only. |
| Period tables | Always write monthly + yearly + all-time (3 tables). Per leaderboard setting which of the three are shown. |
| Sort order | Per leaderboard `SortOrder` enum `asc` / `desc` (replaces a "higher is better" boolean). Scores are always absolute values. |
| Score write semantics | Write-through: an entry sets the current month, current year and all-time rows to the same value (overwrite, not only-if-better). Absolute values. One exception since 2026-10-12: a step (`POST …/score/step`, +1 or −1, number boards only) adds one to each of the three, so a running count stays right per period; no value drops below zero, and a period without a value gets none from a step down. |
| Score steppers | Per leaderboard setting `show_steppers` (number boards only): the board shows +1 / −1 buttons beside each score. They send a step (since 2026-10-12). Before, they sent the shown score ± 1 as an absolute value, which made the month, year and all-time values equal. |
| My rank beyond the top 500 | The API counts at most `RANK_LIMIT` rows ahead of the caller; past that `me.rank` is the string `"500+"` (ranks are strings in `me`), so a long tail never costs a full count. |
| Admin override | Owner and admins can always edit/delete scores; history records who did it. |
| Owner leaving | Owner cannot leave. Must transfer ownership or delete the group. Account deletion is blocked while owning a group. |
| Dayparts | morning 08:00–12:00, afternoon 12:00–18:00, evening 18:00–24:00. Europe/Amsterdam, platform-wide. |
| Sessions | JWT access (15 min) + refresh (60 days) like carrefour, delivered as httpOnly cookies on the shared parent domain. |
| FE ↔ API | Separate hosts: app `bijzijnismeemaken.milovanderpas.nl` (with `bethereorbesquare.milovanderpas.nl` as a redirect-only alias), API `bijzijnismeemaken-api.milovanderpas.nl` (hostnames settled 2026-10-10). CORS with credentials, cookie `Domain=.bijzijn.milovanderpas.nl`. |
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
| Leaderboard members | Any member can add; remove = whoever may edit that leaderboard + owner/admins. Guests: a player without an account can be added by name (plus a random or chosen avatar); they are a `leaderboard_members` row with no user and can never log in or enter scores. Decided 2026-10-10. |
| Leaderboard players | No separate "add player" step: the ranking's "add score" picks a group member, somebody already on the board, or a guest name, and the first score puts them on the board (web adds the member, then the score). The board page is one card with a Ranking tab and a Players tab (list, remove). The number one's avatar sits on a gold tile; a score that makes somebody the new number one fires confetti. Decided 2026-10-10. |
| Timer tab | A time leaderboard gets a Timer tab: one stopwatch on the device, tap the readout to start and tap again to stop, laps, result saved as a score (task 28c, built). |
| Tools tab | A sixth group tab with small helpers for game nights: score tracker (history of +/− entries, totals), darts scorer (501/301 and around the clock), Yahtzee sheet with both bonuses, more later (task 44, one of the last). A game can be ended early, when the scores as they stand decide, or cancelled. Per device in local storage, resumable, no live sharing, no hand-off to a leaderboard. Private 1v1 leaderboards are an M5 idea instead. Decided 2026-10-10. |
| Tournaments | A seventh group tab (M4, tasks 45–48). Formats: knockout, and a group stage followed by a knockout. Players or teams, chosen when the tournament is made; teams are built by hand or drawn at random. Draw auto-filled, with drag to reorder slots and groups before the start. A result is a score per side (3-4); the winner advances in the knockout; group points for a win and a draw are set beforehand, order by points then score difference. The two sides of a match may enter their own result; the organiser (creator) and admins may correct it. A tournament can be made from an activity of the new `tournament` category, or on its own. Finished tournaments stay in an archive with every match and the winner. No leaderboard hand-off, no live push (reopen or refresh), no notifications. Decided 2026-10-10. |
| Leaderboard card | The list card shows the top 3 of one ranking, chosen per board (`card_period`, one of the shown periods; default the first shown), instead of period labels. Decided 2026-10-10. |
| Private leaderboards (decided 2026-10-12, task 49) | A leaderboard can be made private when it is created, never later. Only the people on it see it, group admins and the owner included; it is never a dashboard widget. Everybody on it manages it and enters scores, so it has no edit mode or editors. At most 8 people, guests included; the creator is always on it, and the last person with an account cannot be taken off (deleting it is the way out). When the last of them leaves the group, the board is deleted. Meant for a running win count between a few people: the darts and score tools can add a sole winner's win to one that has everybody from the game on it. |
| Date fields (decided 2026-10-12) | Dates are entered and shown as dd/mm/yyyy on every device through the app's own `DateField`: the browser's date field followed the device's language, so an English phone showed mm/dd/yyyy. Typed (the slashes come by themselves) or picked from a month calendar, Monday first. Time fields stay the browser's. |
| Google free/busy | Every synced event blocks, also one marked "Free" in Google (decided 2026-10-12; Google marks all-day events Free by default, so the flag hid holidays and full days). The ignore rules keep an event out. Skip cancelled, declined, birthday and working-location events; out-of-office and focus-time count as busy. |
| Past planned occurrence | Stays `planned` until creator/admin re-dates it or marks it done; no auto-done (a non-recurring activity may be next year's event). |
| Planned e-mail | Only the selected participants are notified (with add-to-calendar); deselected "in" members are not. Per-participant `notified_at` + the notified values are stored so editing an occurrence only mails new participants (planned) and already-notified ones whose date/daypart/time changed (rescheduled). |
| Email + password (added 2026-10-10) | Second sign-in method beside Google. Verify email before first use (24 h link), forgot/reset via 1 h single-use link that revokes all sessions, one account per email: Google login on a verified password account attaches `google_sub`; on an unverified one it clears the password. Passwords hashed with Node `scrypt`, min 10 chars. Built alongside Google in tasks 7–10. |
| Group dashboard (added 2026-10-10) | Every group has a dashboard as its first tab and landing page: an ordered list of widgets. Defaults are seeded rows (upcoming planned activities, ideas waiting for a date). Admins add, configure, reorder and remove widgets (leaderboard top list, pinned note, activity spotlight, external link); members only view. Built as task 28b, after leaderboards. |

---


## 1.1 Users & profiles
- As a visitor I sign in with Google; an account is created on first login (email + google_sub, email counts as verified).
- As a visitor I register with email and password; I get a verification email and can only sign in after clicking it (the link also signs me in). I can ask for the email again.
- As a user I reset a forgotten password through an emailed link (1 h, single use); a successful reset signs out every other session. A Google-only account can use the same flow to add a password.
- As a user I change my password in settings (current password required when one exists).
- One account per email: signing in with Google on an address that already has a verified password account links the two; both methods then work.
- As a new user I complete onboarding: unique handle (3–24 chars, `[a-z0-9_]`), display name, avatar from a fixed set (16 built-in icon avatars), language (nl/en, prefilled from browser). From M2 (task 38b) two skippable steps follow: connect Google Calendar and mark the dayparts I am usually busy; skipping leaves a "finish your setup" card on the groups page.
- As a user I edit profile, language, notification preferences and "auto add planned activities to my calendar".
- As a user I can delete my account (blocked while I own a group; otherwise leaves all groups with the leave rules, deletes calendar data, tokens, user).
- A user can be in many groups.

## 1.2 Groups
- Create group: name, description, access = `public` | `invite_link` | `invite_only`. Creator becomes owner.
- Public groups: listed with search by name; any signed-in user can join. They carry an invite link as well (added 2026-10-10), so a member can hand a friend a link instead of a search; every member may copy it, owner/admin regenerate it.
- Invite link: `APP_URL/join/<slug>-<token>`; the API resolves by token only (slug is cosmetic). The token is the last 43 characters of the path (base64url, so it can contain dashes itself); the web page extracts it that way. Non-expiring; owner/admin can regenerate (invalidating the old one); the token is nulled when access becomes invite-only and minted when it becomes public or invite-link.
- Invite only: owner/admin invites by `@handle`; invitee gets a notification + in-app pending invite; accepts or declines.
- Roles: owner (1), admin, member. Owner transfers ownership to another member (old owner becomes admin). Owner deletes group.
- Admin: change settings, invite/add/remove members (not owner, not other admins), regenerate link. Owner additionally: promote/demote admins, remove admins, transfer, delete.
- Leave group (admin/member): see 1.6.

## 1.3 Activities
- Any member creates an activity: category (event, home, outdoors, sports, food and drinks, trip, other; one column for icon, filter and form hints, never separate schemas; decided 2026-10-10), title, description, image URL, date mode (`none` | `specific` date | `weekday` | `period`: any day from a first to a last day, both included), optional time, recurring flag, optional extras: location text + maps URL, min/max people, cost per person, duration (minutes), external URL, preferred dayparts (subset of morning/afternoon/evening).
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
- Private boards (task 49): chosen at creation with the people on it (the creator plus up to 7 others). Only they see it, admins included; everybody on it manages it and enters scores; never on the dashboard. A finished darts or score game with one winner can add that win, as a step up, to one with everybody who played on it (by name).

## 1.5b Group dashboard
- The group root (`/groups/:id`) is the dashboard: the first tab, and where opening a group lands.
- A dashboard is an ordered list of widgets. There is no built-in versus custom distinction: creating a group seeds the default rows, which can be reordered and removed like any other, and a "restore defaults" action puts them back.
- Widget types (first version): `upcoming` (planned occurrences in the next N weeks with participants), `ideas` (activities without a date, ranked by interest), `leaderboard` (one board, one period, top N), `note` (pinned text: a title and a few lines, e.g. where the next evening is and what to bring), `activity` (spotlight on one activity), `link` (an external URL with a label, e.g. the WhatsApp group or a photo album).
- Owner and admins add, configure, reorder and remove widgets. Members only view.
- Each widget component loads its own data through the existing endpoints (occurrences, activities, leaderboard scores); the dashboard endpoint only carries the widget list and config.
- Later: a "who is free this week" widget once availability exists; group-level pins in the activity list.

## 1.5c Tournaments (M4)
- Any member creates a tournament in the group's Tournaments tab: name, description, format (`knockout` or `groups_knockout`), participant mode (`players` or `teams` with a team size), points for a win and for a draw (group stage), number of groups and how many advance per group (group stage), optional third-place match. Optionally made from an activity of category `tournament`; that activity then links to it.
- Draft: the organiser adds entries, group members or guests by name, as players or as teams (built by hand, or drawn at random from the people added). The draft shows the tournament as it will be played: a knockout's bracket as the start would draw it, or the groups. The draw is auto-filled and shuffle draws it again; two entries trade places by dragging one onto the other (or tapping one and then the other on a phone), and in a group stage an entry can also go to another group. Byes are added when the knockout count is not a power of two.
- Start: matches are generated (group stage: every entry in a group plays every other once; knockout: a bracket with byes auto-advancing). From then on entries are fixed.
- Results: a score per side; the higher score wins, a draw is possible in the group stage only. Either side's members may enter the result of their own match while it has none; the organiser and admins may enter or correct any result. A knockout winner advances to the next match. When every group match is played, the organiser advances the top entries per group into the knockout, seeded by group rank.
- Finished: the final's winner is the tournament winner. Finished tournaments move to the archive (a filter on the tab) and stay readable: bracket, group tables, every match.
- Viewing: every member sees the current state when they open it; no live push.
- Out of scope: double elimination, Swiss, round robin as a standalone format, best-of series, notifications, leaderboard hand-off.

## 1.6 Leaving / decoupling
- Leaving member: their activities → `created_by = NULL`, `creator_name_snapshot`, `is_active = false` (hidden from lists, visible to admins in an "inactive" filter) and their open occurrences are cancelled with participants notified (M2: auto-added provider events deleted); interests and participations removed; leaderboard membership rows → `user_id = NULL` with `display_name_snapshot`; history `changed_by` decoupled the same way; editor rows and pending invites removed.
- Owner cannot leave (409 with code `OWNER_MUST_TRANSFER`).

## 1.7 Notifications (MVP email only; push phase 3; no in-app inbox)
- `GROUP_INVITE` (invitee), `ACTIVITY_PLANNED` / `ACTIVITY_RESCHEDULED` / `ACTIVITY_CANCELLED` (selected participants only), `ACTIVITY_CREATED` (all group members except the creator). Per-user email toggle per type.
- Email in user's locale, "Add to calendar" button (ICS download via signed link + Google Calendar template link).

## 1.8 Out of scope (for now)
Image uploads, comments/chat, app-store apps, Apple/Outlook calendar (abstraction only), push notifications in MVP, multi-timezone, group avatars, activity polls/voting, score increments, real-time updates, admin backoffice, rate-limited public API, frontend tests.
