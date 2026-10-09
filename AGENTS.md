# AGENTS.md

Working notes for anyone (human or AI) implementing this project. Read this first, then `docs/`.

## What this is
"Bij zijn is meemaken" / "Be there or be square": a PWA for friend groups to collect activities, see when everyone is free (Google Calendar + manual availability), plan dates, and keep leaderboards. Next.js frontend, Express API, MySQL, npm-workspaces monorepo.

## Working agreement
- **One task per session.** Open `docs/PROGRESS.md`, take the first unchecked task, build only that task, run lint / type-check / tests, tick the task with a dated note, then stop so the owner can review. Do not start the next task unless asked.
- Task definitions: `docs/07-milestones.md`. Design decisions: `docs/01-requirements.md` (decisions log) and the other numbered docs. If implementation forces a design change, update the doc in the same session and say so in the review note.
- The API skeleton is **copied** from `C:\Users\milov\PersonalProjects\dynamic_alarm\apps\api` and trimmed (see `docs/02-architecture.md` §2.3), not rewritten. Improve it only after it boots and its health test passes.

## Non-negotiable conventions
- No jobs folder: cron work is a `POST /api/v1/worker/<job>` endpoint on `WorkerController` calling a service; Ofelia calls it.
- Backend: `docs/10-backend-conventions.md`. Route classes, zod validation, services return results and never touch `res`, flat `{ code, message, details }` errors, TypeORM active record + Knex migrations, integration tests against a real `_test` database for every endpoint.
- Frontend: `docs/09-frontend-conventions.md`. Thin server pages + `"use client"` views, feature folders, pure logic in `lib/` with tests, hooks as glue, TanStack Query for server state, Zustand for preferences only, typed i18n dictionaries (nl + en), Tailwind v4 tokens.
- Shared: endpoint paths, error codes, enums and DTOs live in `packages/types` (`@bzim/types`) and are imported by both apps.
- Time: everything is computed in `Europe/Amsterdam`, stored in UTC. Dayparts are 08–12 / 12–18 / 18–24.
- No application code was written during planning; the first code task is task 1 in `docs/PROGRESS.md`.

## Commands (once the skeleton exists)
```
npm install
npm run docker:up          # local MySQL (+ mailpit)
npm run build:packages     # build @bzim/types before type-checking apps
npm run dev                # api + web
npm run lint && npm run type-check && npm run test
```
