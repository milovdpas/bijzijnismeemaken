# Planning docs

Written during the planning phase (2026-10-09) from [planning-prompt.md](../planning-prompt.md) plus the Q&A rounds. Cross-references like "section 2.3" point at the document whose number matches the first digit (2.x = `02-architecture.md`, 1.x = `01-requirements.md`, and so on).

| Doc | Contents |
|---|---|
| [01-requirements.md](01-requirements.md) | Decisions log, user stories per feature, out of scope |
| [02-architecture.md](02-architecture.md) | Monorepo layout, what is copied from dynamic_alarm, API and web structure, auth flow, calendar provider abstraction, cron, notifications, i18n, PWA, deployment |
| [03-data-model.md](03-data-model.md) | MySQL tables, columns, keys, ON DELETE rules, score semantics |
| [04-api.md](04-api.md) | Endpoints with method, path, purpose, permission; pagination contract |
| [05-permissions.md](05-permissions.md) | Actions × roles matrix and how it is enforced |
| [06-availability-algorithm.md](06-availability-algorithm.md) | Busy/free per day × daypart, date suggestion ranking, edge cases |
| [07-milestones.md](07-milestones.md) | M0–M4 with 43 numbered tasks |
| [08-risks.md](08-risks.md) | Open risks and questions |
| [09-frontend-conventions.md](09-frontend-conventions.md) | Clean frontend rules (from marathon_schema) |
| [10-backend-conventions.md](10-backend-conventions.md) | Express API rules (from dynamic_alarm) |
| [11-design.md](11-design.md) | Visual direction, tokens, themes (scheme + palette), shell and UI patterns |
| [12-deployment.md](12-deployment.md) | What the VPS, DNS, GitHub, Google and Brevo need before the first deploy, and the first-deploy order |
| [PROGRESS.md](PROGRESS.md) | Task checklist, current task, review log |
