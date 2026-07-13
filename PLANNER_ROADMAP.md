# Planner Features & Design Refresh — Roadmap

Worktree: `planner-features` (this branch). Follows existing glassmorphism + Express/Drizzle conventions.

## Build order & schema changes

### Schema (`src/db/schema.ts` + migrations `src/db/migrations/`)
- `024_focus_rating.sql` — `ALTER study_sessions ADD COLUMN focus_rating INTEGER` (1–5).
- `025_study_exams.sql` — NEW `study_exams` (id, userId, title, examDate, subject, color, createdAt).
- `026_study_plan_instances.sql` — NEW `study_plan_instances` (id, planId, userId, occurrenceDate, dayOfWeek, startHour, durationMinutes, color, title, description, deckId, createdAt) for recurring expansion.

### Backend routes (`src/routes/`)
1. **Recurring expansion** — helper `expandRecurringPlan()`; `POST /api/planners/:id/expand`, `GET /api/planners/instances?weeks=N`. Auto-expand on create/update.
2. **Overlap detection** — `GET /api/planners/overlaps` (same day/time pairs); `hasConflict` flag added to week payload; soft validation message.
3. **Reminders** — `notifications` rows (type `study_reminder`, createdAt = occurrence − lead mins, default 15); `GET /api/planners/reminders`. Wired to existing bell.
4. **Exams CRUD** — `src/routes/study-exams.ts` mounted at `/api/study-exams` (list/create/get/update/delete). Countdown is frontend-computed.
5. **Focus rating** — extend `endStudySessionSchema` + end handler to persist `focusRating`. Surfaced in analytics.
6. **Streak history + ICS/PDF** — `GET /api/planners/streak-history?days=120` (per-day completion); `GET /api/planners/export/ics` (downloadable .ics). PDF handled client-side via print-optimized view.

### Frontend (`new-frontend/`)
- `src/lib/api.ts` — `examsApi`, extended `studySessionsApi.end(focusRating)`, `plannersApi.{expand, instances, overlaps, reminders, streakHistory, exportIcs}`; `PlannerPlan` gains `hasConflict`, `instanceId?`.
- `src/pages/Planner.tsx` + `components/planner/*`:
  - F7 Duration-spanning blocks (CSS `grid-row: span N`).
  - F8 Sidebar rail (Calendar·Today·Focus·Exams·Analytics).
  - F9 Focus/Now mode (full-screen Pomodoro 25/5/15).
  - F10 Subject legend + filter, reschedule-to-tomorrow, empty-state onboarding, AI context = existing sessions.
  - F3 overlap warning, F4 exam countdown widget, F5 Pomodoro focus rating, F6 streak heatmap + ICS/PDF export, subject-tinted glass.
- Design refresh: dim starfield on `/planner`, 2–3 drifting gradient orbs behind glass, layered glass (thick grid container / thin cards, top-edge highlight), blur only the grid container.

## Commits (per group)
- `feat(planner): schema + migrations for exams, instances, focus rating`
- `feat(planner): recurring instance expansion + endpoints`
- `feat(planner): overlap detection + reminders`
- `feat(planner): exams CRUD + streak history + ICS export`
- `feat(planner): focus rating on session end`
- `feat(frontend): api client for new planner endpoints`
- `feat(frontend): duration-spanning, overlap warnings, subject tint/legend`
- `feat(frontend): sidebar rail, Focus/Now mode, exam countdown, heatmap, export, AI context`

No push/merge unless asked.
