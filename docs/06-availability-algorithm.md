# 06 — Availability algorithm


Inputs for a user `u` and local date `d` (Europe/Amsterdam), daypart `p ∈ {morning [08:00,12:00), afternoon [12:00,18:00), evening [18:00,24:00)}`:

1. **Manual one-off**: row in `manual_unavailability (u, d, p)` → busy (reason `manual`).
2. **Weekly rule**: row with `weekday = weekday(d)`, `daypart = p`, `(valid_from IS NULL OR ≤ d)`, `(valid_until IS NULL OR ≥ d)` → busy (reason `rule`).
3. **Calendar**: any `calendar_events` of `u` from an enabled source where NOT ignored, NOT `transparent` (Google "Free"), and overlaps:
   - ignored if `lower(title)` ∈ ignore titles, or `recurring_event_id` ∈ ignored series;
   - all-day event: `start_date ≤ d < end_date` → busy for all three dayparts;
   - timed event: convert `[start_at, end_at)` to Amsterdam local; overlaps `[d p.start, d p.end)` iff `start < p.end && end > p.start` (touching edges don't count);
   - → busy (reason `calendar`, never exposing title to others).
4. Otherwise **free**. Each user also carries `hasCalendar` (active connection with ≥1 enabled source and a successful sync) for the UI indicator.

Computation: `AvailabilityService.matrix(userIds, from, to)` loads all blocks/rules/events for the users and range in 3 queries, builds a `Map<userId, Map<date, Map<daypart, Reason|null>>>` in memory (max ~ 20 users × 84 days × 3 = ~5k cells). The group endpoint strips reasons to `busy/free`; the self endpoint keeps reasons.

**Date suggestions** (`SuggestionService.rank(activity, memberIds, from = today, weeks = 12)`):
1. Candidate dates: `date_mode = specific` → that date only (if ≥ today); `weekday` → every matching weekday in range; `period` → every day of the period in range, the range starting on the period's first day when that lies after `from`; `none` → every day in range.
2. Candidate dayparts: `preferred_dayparts` if set; else if the activity has a `start_time`, the daypart containing it; else all three.
3. For each (date, daypart): `freeCount` = members free, `freeIds`, `busyIds`.
4. Sort by `freeCount DESC`, then `date ASC`, then daypart order (morning, afternoon, evening). Return top 30 plus the total candidate count; the UI groups by date.
5. Existing planned occurrences of other activities in the same group on the same (date, daypart) are flagged `conflict: true` (not excluded).

**Occurrence time semantics** (used by ICS, Google template link, conflict flag and the availability overlay): `daypart` only → that daypart's range; `start_time` set → `[start, start + activity.duration_minutes ?? 120)` and it overlaps every daypart it touches; neither → all-day ICS event and conflicts with all three dayparts.

**Edge cases**: timed events crossing midnight or spanning days are handled by the plain interval overlap after conversion to Amsterdam local time; multi-day all-day events use `start_date ≤ d < end_date`; DST days (23 h / 25 h) still have the three wall-clock dayparts (all conversions via Luxon `Europe/Amsterdam`); a weekly rule with `valid_until` in the past is ignored; "ignore series" matches `recurring_event_id` on the expanded instances; events skipped at sync (cancelled, declined, birthday, working location) never reach the algorithm.
