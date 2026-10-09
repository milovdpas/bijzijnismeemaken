# Bij zijn is meemaken

A progressive web app for a group of friends to collect activities they want to do together, see when everyone is free (connected Google Calendars plus manual availability), pick a date, and keep leaderboards for games and challenges.

Working names: "Bij zijn is meemaken" / "Be there or be square".

## Status
Planning complete, implementation not started. See [docs/PROGRESS.md](docs/PROGRESS.md) for the task checklist and [docs/](docs/README.md) for the full plan (requirements, architecture, data model, API, permissions, availability algorithm, milestones, risks, conventions).

## Stack
- `apps/web`: Next.js (App Router) installable PWA, Dutch and English
- `apps/api`: Express 5, TypeORM + Knex migrations, MySQL 8, Google login (JWT cookies), Google Calendar sync, Brevo email
- `packages/types`: shared endpoints, error codes, enums and DTOs
- Hosted on a personal VPS with Docker Compose; scheduled jobs via Ofelia

## Contributing
Read [AGENTS.md](AGENTS.md) first: one task per session, review after each.
