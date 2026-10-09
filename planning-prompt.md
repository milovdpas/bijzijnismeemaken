# Planning prompt: friends activity & availability app

## Your role

You are the technical lead for a new personal project. Your job right now is to **plan**, not to build. Most requirements are already settled below. Read them carefully, then ask me about anything that is still unclear or that I have not thought of. Group your questions by topic and ask them in rounds (max ~10 per round). Do not assume answers to open points; ask. Once everything is clear, produce the planning deliverables listed at the bottom.

Do not write application code during this phase.

## What the app is

A web app (PWA) for a group of friends to collect activities they want to do together, see when everyone is free (via connected calendars plus manual availability), pick a date, and keep leaderboards for games and challenges.

Working names (not final): "Be there or be square" / "Bij zijn is meemaken".

## Tech stack and project setup (decided)

- Monorepo, structured like `C:\Users\milov\PersonalProjects\dynamic_alarm`.
- Frontend: Next.js, built as an installable PWA (not in app stores). Reuse the install approach from `C:\Users\milov\PersonalProjects\marathon_schema\components\settings\install-app-card.tsx`.
- Backend: Express.js. Use `C:\Users\milov\PersonalProjects\dynamic_alarm\apps\api` as the template. Read it first and summarize the conventions you will carry over (structure, error handling, validation, config, etc.).
- Backend tests in the same style as `C:\Users\milov\PersonalProjects\dynamic_alarm\apps\api\tests`. No frontend tests for now.
- Database: MySQL.
- Authentication: Google login only. On first login an account is created automatically.
- i18n: Dutch and English from day one.
- Calendar integration: Google Calendar first. Design a provider abstraction so Apple/other calendars can be added later without rework.
- Scale: a handful of friend groups. Self-hosted on my own VPS; deployment details to be discussed with you later.
- Notifications: email, plus web push (PWA push notifications) where feasible.
- Scheduled jobs: backend cron jobs (calendar sync, cleanup).

## Functional requirements (decided)

### Users and profiles
- A user has a display name (chosen by the user, not their real name) and an avatar picked from a fixed set of built-in avatars. No image uploads anywhere in the platform for now.
- A user can be a member of multiple groups.

### Groups
- Visibility: **public** or **private**.
  - Public: listed in an overview of public groups with a search input; anyone can join.
  - Private: either **invite link** (a non-expiring link that contains the group name; anyone with it can join) or **invite only** (members are invited from inside the app by username; the invited user gets a notification and accepts).
- Roles:
  - **Owner**: exactly one per group, the creator. Can do everything. Ownership can only be transferred by the owner to another member.
  - **Admin**: can add and remove members and change group settings.
  - **Member**: no management permissions.

### Activities
- Every group member can add activities.
- Fields: title, description, image (URL only), optional date, optional time.
- Date can be: a specific date, a day of the week (meaning "any <weekday> works", and recurring activities can be planned on that weekday repeatedly), or no date.
- Status/label: **idea** -> **planned** -> **done**.
- Activities can be marked **recurring** (not a one-time event), so they can be planned multiple times (e.g. a weekly game night). Each planning of a recurring activity should be its own occurrence.
- "I'm in": members can mark interest in an activity. Admins can also mark other members as "in" (for slow responders). When planning a date, the planner can select/deselect which "in" members count.
- Edit/delete: creator and admins.
- No comments or chat.
- Extra information fields (all optional): location (text + optional maps link), minimum and maximum number of people, estimated cost per person, expected duration, external link (website or tickets), preferred dayparts.

### Availability and planning
- Members connect Google Calendar. Calendar events are synced by a backend cron job **once a day at midnight** and stored in the database. Past events are deleted by a cleanup cron job.
- Privacy: other members only ever see **busy/free**, never event titles.
- A user is busy for a daypart if any synced event overlaps it, unless that event is on the user's ignore list. An all-day event makes the user busy for the whole day.
- Ignore rules: a user can ignore events by title and/or an entire recurring series (e.g. a daily "lenzen indoen" event).
- Manual unavailability: a user can mark themselves unavailable on specific days per daypart: morning, afternoon, evening. Dayparts have fixed time ranges (propose the ranges).
- Group calendar overview showing per day/daypart who is free. Two views: the whole group, and only the members who are "in" for a given activity.
- When an activity gets planned on a date, members who are "in" receive an email notification with an "add to calendar" button. Nothing is pushed into their Google Calendar automatically, unless the user has enabled a personal setting "automatically add planned activities to my calendar".
- Date suggestions: on the planning screen of an activity, show the upcoming dates ranked by how many of the selected ("in") members are free, so the planner can pick quickly.

### Leaderboards
- A group can have multiple leaderboards; they are always standalone (not tied to an activity).
- Score type per leaderboard: **number** or **time** (duration).
- Sort direction per leaderboard: higher is better or lower is better.
- Period per leaderboard: **all time** or **monthly**. I will explain the exact monthly mechanics to you when we get there; ask me before designing it.
- One score per user.
- Any group member can add members to a leaderboard.
- Edit permissions per leaderboard, set by the creator: everyone in the group, only the creator, or a selected set of members.
- Full score history (who changed what, when, old and new value), viewable on a separate history page.

### Leaving a group
- Activities created by the leaving user are decoupled from their account and set to inactive.
- Their leaderboard scores and history stay, showing only their display name as a snapshot; the rows are no longer linked to the account.

## Still open (ask me about these, plus anything else unclear)

- Monthly leaderboards: exact mechanics (I will explain).
- Daypart time ranges.
- Email provider and web push implementation approach.
- Whether an owner/admin can edit scores regardless of leaderboard permissions.
- What happens when the owner leaves (forced transfer first?) and when a user deletes their account entirely (same as leaving all groups?).
- Session handling for the Google login (JWT vs server sessions) and token storage for Google Calendar refresh tokens.

## Deliverables once requirements are clear

1. **Requirements document**: confirmed requirements as user stories grouped by feature, plus explicit out-of-scope items.
2. **Architecture overview**: monorepo layout, Next.js and Express responsibilities, auth flow (Google OAuth, session handling), calendar provider abstraction, cron jobs, notification flow, i18n approach, PWA setup.
3. **Data model**: MySQL schema (tables, columns, relations, indexes) with a short explanation per table.
4. **API design**: endpoints with method, path, purpose and required permissions.
5. **Permission model**: one table of actions × roles (owner/admin/member, activity creator, leaderboard edit permissions).
6. **Availability algorithm**: how synced events, ignore rules, manual unavailability and dayparts combine into per-day/per-daypart availability, and how date suggestions are ranked.
7. **Milestone plan**: an MVP cut and 2–3 follow-up phases, each with concrete tasks small enough to implement one at a time.
8. **Open risks and questions** that remain after planning.

Keep documents concise and skimmable. Ask before assuming.
