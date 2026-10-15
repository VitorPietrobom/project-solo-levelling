# Features Backlog

New functionality and UX improvements — things the app doesn't do yet. Bugs in
existing behavior go in [`OE_BACKLOG.md`](./OE_BACKLOG.md) instead.

## How to use this file

- Each item is a single, self-contained task an agent can pick up on its own.
- IDs are stable (`FEAT-###`) — never renumber; append new items at the end.
- When you start an item, set **Status** to `In progress` and note the branch.
  When it's merged, set it to `Done` and add the PR number.
- **Priority:** P1 (next up) · P2 (soon) · P3 (someday).

---

### FEAT-001 — Stacked day-by-day Meal Prep view on mobile
- **Status:** Todo
- **Priority:** P2
- **Area:** Client — Diet
- **Description:** The weekly Meal Prep grid (7 days × 4 meals) scrolls horizontally inside its card on phones. Below ~480px, render it as a vertical list of days (each day a card with its 4 meal slots) so nothing scrolls sideways.
- **Acceptance:** No horizontal scroll inside the Meal Prep card at 375px width; all existing actions (assign, remove meal, week totals) still work.

### FEAT-002 — Level-up feedback on the XP ring/bar
- **Status:** Todo
- **Priority:** P3
- **Area:** Client — Status
- **Description:** Crossing a level currently only shows the XP toast (plus the full-screen overlay). Add a short pulse/glow on the Status hero card's XP ring and bar when a level-up happens so the moment is visible in context.
- **Acceptance:** Animation plays once per level-up, respects `prefers-reduced-motion`.

### FEAT-003 — Completion counts on Quest Board headers
- **Status:** Todo
- **Priority:** P3
- **Area:** Client — Status
- **Description:** Show "2/3 done" next to the Daily / Weekly / Monthly headers on the Quest Board so progress is visible at a glance.

### FEAT-004 — Body outline image for the measurements diagram
- **Status:** Todo
- **Priority:** P3
- **Area:** Client — Body
- **Description:** Replace the hand-drawn SVG silhouette in `BodyMeasurementDiagram` with a proper body outline asset (PNG/SVG), keeping the measurement anchor dots aligned.
- **Notes:** An image was generated externally but never landed in the repo — needs to be committed to `client/public/` first.

### FEAT-005 — Admin view for alpha feedback
- **Status:** Todo
- **Priority:** P1
- **Area:** Server + Client — Alpha
- **Description:** Feedback from the in-app button is stored in the `Feedback` table but there's no way to read it except querying the DB. Add an admin-only (`requireAdmin`) `GET /api/feedback` and a "Feedback" section in Settings (admin only, like Alpha Invites) listing messages newest-first with user email, page and timestamp.

### FEAT-006 — Enforce the alpha invite gate at the API level
- **Status:** Todo
- **Priority:** P2
- **Area:** Server — Auth
- **Description:** The invite gate currently only blocks the UI (`ProtectedRoute`); an unactivated account can still call the API directly. Enforce `User.activated` server-side for all routes except `/api/invite/*`, updating the controller test mocks that stub `prisma.user.upsert()` accordingly.

### FEAT-007 — Link training programs to gym-session logging
- **Status:** Todo
- **Priority:** P2
- **Area:** Client + Server — Body
- **Description:** Training programs and logged gym sessions are unrelated today. When logging a session manually, offer "Start from today's program" to pre-fill the exercise rows from the active program's day.

### FEAT-008 — Edit an existing gym session
- **Status:** Todo
- **Priority:** P3
- **Area:** Client + Server — Body
- **Description:** Gym sessions can be created and deleted but not edited. Add `PATCH /api/gym-sessions/:id` (replace exercises transactionally) and an edit mode reusing `GymSessionForm`.
