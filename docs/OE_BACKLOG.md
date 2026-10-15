# OE Backlog (Operational Excellence)

Bugs, security holes, data-integrity problems and broken behavior in code that
already exists. New functionality goes in [`FEATURES_BACKLOG.md`](./FEATURES_BACKLOG.md).

Source: full-codebase audit on 2026-10-15 (every server controller/service/middleware,
the Prisma schema, and every client page/component). Duplicate findings were merged.

## How to use this file

- **One item = one task.** Each is meant to be picked up by a single agent and shipped as one PR.
- IDs are stable (`OE-###`) — never renumber. Append new bugs at the end with the next free ID.
- To claim an item set **Status** to `In progress (branch-name)`. When merged, set `Done (#PR)`.
  If an item turns out not to be a bug, set `Won't fix` with a one-line reason.
- **Severity:** Critical (security / data loss / feature fully broken) · High (wrong data, exploitable, or major UX breakage) · Medium (real bug, workaround exists) · Low (edge case / polish).
- **Confidence:** how sure the auditor was. Medium/Low → reproduce first before fixing.
- Line numbers are from the audit snapshot; re-locate by symbol name if they've drifted.
- Items marked **Related** touch the same code — do them in the same PR or sequentially, not in parallel.
- Every fix should come with a regression test (Vitest + Supertest on the server, RTL on the client).

## Summary

| Severity | Count |
|---|---|
| Critical | 3 |
| High | 17 |
| Medium | 47 |
| Low | 34 |
| **Total** | **101** |

---

## Critical

### OE-001 — Enforce the alpha invite gate on the server (and stop the client failing open)
- **Status:** In review (#71)
- **Severity:** Critical · **Confidence:** High
- **Area:** Server — auth / invite gate (+ Client — ProtectedRoute)
- **Location:** `server/src/middleware/ensureUser.ts:16-20`; `server/prisma/schema.prisma` (`User.activated @default(true)`); `client/src/components/ProtectedRoute.tsx:19,43-47`
- **Problem:** Only the client checks `activated`. `ensureUser` creates rows with `create: { id, email }`, so new users get the schema default `activated = true`. Nothing on the server ever rejects an unactivated user. Separately, `ProtectedRoute` treats any error from `/api/invite/status` as "let them in".
- **Impact:** A new signup that hits any other route first (e.g. `GET /api/auth/me`) gets a row with `activated=true` and is fully in without a code. Any unactivated user can call every API directly. A 5xx/network blip on the status call also shows the full app to unactivated users.
- **Fix:** In `ensureUser`, create with `activated: false`, re-read the row, and return `403 {code:'INVITE_REQUIRED'}` when not activated (exempt `/api/invite/*`). Only cache activated IDs. Update controller test mocks that stub `prisma.user.upsert()` to return `{activated:true}`. In `ProtectedRoute`, show a retry screen on error instead of rendering children. Supersedes FEAT-006.
- **Related:** OE-003, OE-021, OE-049

### OE-002 — "Log as eaten" on a recipe never works (wrong mealType casing)
- **Status:** In review (#70)
- **Severity:** Critical · **Confidence:** High
- **Area:** Client — Recipes
- **Location:** `client/src/pages/RecipesTab.tsx:75,81-83`
- **Problem:** `handleLogAsEaten` posts `mealType: 'Snack'`; the server only accepts lowercase `breakfast|lunch|dinner|snack`, so every request 400s. The catch only resets the button — no toast.
- **Impact:** The feature is fully broken and fails silently.
- **Fix:** Send `'snack'` (better: let the user pick the meal). Show `showToast(errorMessage(err, 'Failed to log recipe'))` in the catch, and bump the Diet refresh on success.

### OE-003 — Admin access is decided by an unverified email claim
- **Status:** In review (#68)
- **Severity:** Critical · **Confidence:** Medium (depends on Neon Auth email-verification settings)
- **Area:** Server — requireAdmin
- **Location:** `server/src/middleware/requireAdmin.ts:6-10`; `server/src/middleware/auth.ts:73-76`
- **Problem:** Admin = `payload.email === ADMIN_EMAIL`, with no `email_verified` check. Better Auth can issue JWTs before email verification.
- **Impact:** Anyone who signs up with the admin's address could mint unlimited invite codes and list every tester's email.
- **Fix:** Match on an `ADMIN_USER_ID` env var (the JWT `sub`) instead of email, or additionally require `payload.email_verified === true`. Update `docs`/Vercel env accordingly.

---

## High

### OE-004 — Changing a quest's xpReward / linked skill after completion mints or destroys XP
- **Status:** In review (#72)
- **Severity:** High · **Confidence:** High
- **Area:** Server — quests / XP (+ Client — HabitRow, QuestCard)
- **Location:** `server/src/controllers/quests.ts:159-182, 229-234, 263-265, 278-279`; `client/src/components/HabitRow.tsx:41`
- **Problem:** `updateQuest` allows editing `xpReward` and `linkedSkillId` on a completed quest/habit, and every revoke path uses the *current* values, not what was actually awarded.
- **Impact:** Complete at 1000 → edit to 1 → undo (−1) → edit to 1000 → complete (+1000) farms unlimited XP. The reverse removes XP never given. Changing the linked skill after completion drains the wrong skill.
- **Fix:** Store `awardedXP` and `awardedSkillId` on the quest at completion and revoke exactly those (as `SpecialQuestCompletion.xpAwarded` does). Alternatively reject those edits while completed for the current period, and disable the XP field in the UI in that state.
- **Related:** OE-005, OE-006, OE-035

### OE-005 — Deleting a skill makes linked quests drain user XP on every reset
- **Status:** Todo
- **Severity:** High · **Confidence:** High
- **Area:** Server — quests / skills / XP
- **Location:** `server/src/controllers/quests.ts:229-234, 263-265, 275-281, 325-327, 336-339`; `server/src/controllers/skills.ts:84`; schema `Quest.linkedSkillId`
- **Problem:** `linkedSkillId` is a plain string with no FK. `deleteSkill` doesn't clear it. `grantSkillXP`/`revokeSkillXP` then throw P2025 *after* user XP and quest state were already changed, with no transaction.
- **Impact:** Link a quest to skill S, complete it, delete S, reset the quest: user loses X XP, gets a 500, quest stays `completed`, and every retry takes another X. Complete paths award XP and 500.
- **Fix:** Make it a real optional relation with `onDelete: SetNull` (or clear `linkedSkillId` on quests/books when a skill is deleted). Use `updateMany` for skill XP so a missing skill is a no-op. Wrap each complete/reset flow in `prisma.$transaction`.
- **Related:** OE-004, OE-007

### OE-006 — Concurrent complete / step-toggle requests double-award XP or never complete
- **Status:** Todo
- **Severity:** High · **Confidence:** High
- **Area:** Server — quests (+ Client — GamificationTab)
- **Location:** `server/src/controllers/quests.ts:204-235, 314-339`; `client/src/pages/GamificationTab.tsx:191-205, 225-235`
- **Problem:** Read-check-write with no conditional update or transaction. Two simultaneous completes (double tap, two tabs, PWA replay) both see `completed:false`. Two step toggles each see the other step as open, so neither completes the quest.
- **Impact:** Double-click ✓ → 2× XP. Check the last two steps quickly → card shows Done on the client, server never completes it or awards XP.
- **Fix:** Server: flip state with `updateMany({where:{id, completed:false}})` and award only when `count===1`; recompute `allDone` from the DB inside `$transaction` after the step write; for recurring quests condition on `lastCompletedAt`. Client: ignore toggles for a quest with a request in flight.

### OE-007 — Books can grant/revoke XP on another user's skill (IDOR)
- **Status:** In review (#67)
- **Severity:** High · **Confidence:** High
- **Area:** Server — Learning / books / XP
- **Location:** `server/src/controllers/books.ts:82, 165, 168`; `server/src/services/xp.ts:85-97`
- **Problem:** `createBook` stores any `linkedSkillId` without an ownership check; `grantSkillXP`/`revokeSkillXP` update by id only.
- **Impact:** Create a book with a victim's skill id and `totalPages: 100000`, mark finished → victim's skill +100k XP. Missing skill → P2025 after the book was already marked finished → 500.
- **Fix:** Validate `prisma.skill.findFirst({where:{id, userId}})` on create/update (400 otherwise). Make grant/revoke `updateMany({where:{id, userId}})` so they're scoped and missing skills are no-ops.

### OE-008 — Nutrition XP can be claimed for any past or future date
- **Status:** In review (#66)
- **Severity:** High · **Confidence:** High
- **Area:** Server — nutrition XP
- **Location:** `server/src/controllers/nutrition.ts:261-283`; `server/src/controllers/food-entries.ts:51-72`
- **Problem:** `claimNutritionXp` accepts any `YYYY-MM-DD`; food entries can be created for any date; deleting the entries doesn't revoke the claim.
- **Impact:** Log a meal on 2019-01-01, claim → +40 XP; repeat for every date to farm unlimited levels.
- **Fix:** Only allow claims for today±1 day (timezone slack); return 400 otherwise. Optionally reject food entries dated in the future.

### OE-009 — Saving a meal-prep plan can wipe the whole week (non-transactional replace)
- **Status:** In review (#65)
- **Severity:** High · **Confidence:** High
- **Area:** Server — meal prep
- **Location:** `server/src/controllers/meal-prep.ts:94-118`
- **Problem:** `deleteMany` then `update({entries:{create}})` run separately. Duplicate `(dayOfWeek, mealType)` pairs in the payload hit the `@@unique` after the delete already ran.
- **Impact:** A payload with two `mon/lunch` entries (or any DB error / deleted recipe) → 500 and the existing week plan is now empty.
- **Fix:** Wrap find/delete/create in `prisma.$transaction` (as `importMealPrepPlan` does). Dedupe or reject duplicate slots with 400 up front.
- **Related:** OE-040

### OE-010 — API client re-sends every failed POST/PUT/PATCH/DELETE (duplicates, redirect loops)
- **Status:** In review (#73)
- **Severity:** High · **Confidence:** High
- **Area:** Client — API layer
- **Location:** `client/src/lib/apiClient.ts:77-86`
- **Problem:** `handleResponse` is inside the `try`, so the "network retry" also catches every 4xx/5xx `ApiError` and JSON parse errors — every failed mutation is sent twice.
- **Impact:** A POST that 500s after committing creates a duplicate (food entry, invite code, feedback…). 401s redirect, re-send, and redirect again. 400s double server load.
- **Fix:** Wrap only `await fetch(...)` in the try/catch; call `handleResponse` outside it. Only retry idempotent methods (PUT/DELETE), or send an idempotency key for POST.

### OE-011 — Pressing Enter in a delete confirmation always confirms, even on Cancel
- **Status:** In review (#69)
- **Severity:** High · **Confidence:** High
- **Area:** Client — UI / ConfirmDialog
- **Location:** `client/src/components/ui/ConfirmDialog.tsx:11-14`
- **Problem:** A global `keydown` listener calls `onConfirm()` on any Enter, regardless of focus. No initial focus, no focus trap, no `role="dialog"`.
- **Impact:** Tab to "Cancel", press Enter → the item is deleted (quests, skills, books, knowledge nodes).
- **Fix:** Remove the global Enter handler (or skip when `e.target` is a button). Auto-focus Cancel, add `role="dialog"`/`aria-modal`, trap focus, close on Escape.

### OE-012 — Dashboard XP / level header drifts from the server
- **Status:** Todo
- **Severity:** High · **Confidence:** High
- **Area:** Client — Dashboard / Status
- **Location:** `client/src/components/Dashboard.tsx:54-67, 77-87`; `client/src/pages/GamificationTab.tsx:168, 231`; `client/src/components/SpecialQuestPanel.tsx:207-213`; `client/src/components/SkillActionList.tsx:129-130`
- **Problem:** Header `status` is fetched once and only changed by `addXP` (from a stale closure, `totalXP` only). Un-completing never subtracts; server-only XP (last step, skill actions, book finish, knowledge nodes) is never reflected; failed optimistic awards are never undone; level never changes.
- **Impact:** Header XP is wrong after almost any session; level-ups don't show until reload; two quick awards lose one.
- **Fix:** Expose `refreshStatus()` in the Outlet context that refetches `/api/gamification/status`; call it after every XP-affecting request settles. Keep `addXP` for the toast only (fire it after success, not before), or use `setStatus(prev => …)`.
- **Related:** OE-031, OE-059, OE-065

### OE-013 — Optimistic (temp-id) rows on the Body tab can be edited/deleted before they exist
- **Status:** Todo
- **Severity:** High · **Confidence:** High
- **Area:** Client — Body
- **Location:** `client/src/pages/BodyTab.tsx:70-126`; `client/src/components/WeightEntryList.tsx:51-59`; `MeasurementEntryList.tsx:61-65`; `GymSessionLog.tsx:43-50`; `TrainingProgramView.tsx:122-133`
- **Problem:** `temp-<ts>` rows render with working Edit/Delete/Activate buttons immediately.
- **Impact:** Delete a just-logged weight → `DELETE /api/weight/temp-…` 404 → "Failed to delete" and the row returns, or the row vanishes locally while the real record exists on the server.
- **Fix:** Treat `id.startsWith('temp-')` as pending: disable actions and show a pending style until the real id arrives.
- **Related:** OE-041, OE-042, OE-063 (same pattern in other tabs)

### OE-014 — Logging a manual weight over a WHOOP entry shows two points for that day
- **Status:** Todo
- **Severity:** High · **Confidence:** High
- **Area:** Client — Body / weight
- **Location:** `client/src/pages/BodyTab.tsx:74`; server `server/src/controllers/weight.ts:53-62`
- **Problem:** When a WHOOP row exists the server updates it and returns its existing id with 200. The client only swaps out the temp row, so the stale WHOOP row (same id) stays too.
- **Impact:** Duplicate chart points and React duplicate-key warnings; editing either row hits the same record.
- **Fix:** In `.then`, remove any other entry with `id === data.id` before replacing the temp row (or refetch after create).

### OE-015 — Diet "today" and week-Monday use UTC (wrong day; meal-plan import rejected)
- **Status:** Todo
- **Severity:** High · **Confidence:** High
- **Area:** Client — Diet / Recipes / dates
- **Location:** `client/src/pages/DietTab.tsx:24-31, 36`; `MealPrepForm.tsx:21-28`; `FoodEntryForm.tsx:27`; `FoodEntryImport.tsx:53`; `BarcodeFoodForm.tsx:43`; `MealPlanImport.tsx:108`; `RecipesTab.tsx:67`
- **Problem:** "Today" = `new Date().toISOString().split('T')[0]` (UTC). `getCurrentMonday()` keeps the time of day before `toISOString()`, so the local Monday can become a UTC Sunday/Tuesday; the server rejects non-Monday `weekStartDate`.
- **Impact:** UTC−3 user after 21:00 logs food to tomorrow. Meal-plan AI import and manual plan fail with "weekStartDate must be a Monday" in the evening/early morning.
- **Fix:** Add one shared `localISODate(d)` helper (in `client/src/lib/`) from `getFullYear/getMonth/getDate`, and a date-parts `mondayOf()` (like WeeklyNutritionChart's). Use them in every listed place.
- **Related:** OE-024 (server side), OE-030, OE-036, OE-088

### OE-016 — Food entries logged via "+ Log Food" go to today, but appear under the selected day
- **Status:** Todo
- **Severity:** High · **Confidence:** High
- **Area:** Client — Diet / food log
- **Location:** `client/src/components/FoodEntryForm.tsx:27`; `client/src/pages/DietTab.tsx:114, 131, 252`
- **Problem:** FoodEntryForm gets no `defaultDate`, so it always defaults to today; the create/import handlers append the optimistic entry to the visible list whatever its date.
- **Impact:** Select last Tuesday, log food → saved to today, shown under Tuesday until refetch.
- **Fix:** Pass `defaultDate={selectedDate}`. Only add rows whose `date === selectedDate`; always `bumpFoodRefresh()`.

### OE-017 — AI food-import JSON isn't normalized (floats, "Lunch", missing names all 400)
- **Status:** Todo
- **Severity:** High · **Confidence:** High
- **Area:** Client — Diet / AI import
- **Location:** `client/src/components/FoodEntryImport.tsx:45-66`
- **Problem:** Fields pass through unchanged; server requires integer calories, lowercase mealType, non-empty name. A bare top-level array is wrapped as a single entry.
- **Impact:** Typical AI output (`212.5`, `"Lunch"`) shows rows that vanish with one toast each.
- **Fix:** Normalize per entry (`Math.round(Number(calories))`, `Number()` macros, lowercase/map mealType, default `snack`), accept a top-level array, reject invalid entries in the form's error area instead of posting.

### OE-018 — WHOOP daily cron can't finish within Vercel's 30s limit
- **Status:** Todo
- **Severity:** High · **Confidence:** High
- **Area:** Server — WHOOP cron
- **Location:** `server/src/controllers/whoop.ts:290`; `vercel.json` (`maxDuration: 30`)
- **Problem:** Users are synced serially; each does a token refresh, 6 WHOOP calls, up to 14 serial upserts; no fetch timeouts.
- **Impact:** With ~10–20 users or one slow WHOOP response the function is killed; later users never sync, nothing is logged.
- **Fix:** Bounded concurrency (`Promise.allSettled` in chunks of ~5), `AbortSignal.timeout(8000)` on every fetch, batch upserts in one `$transaction`, process oldest `syncedAt` first, stop at ~25s.

### OE-019 — Concurrent WHOOP token refreshes can disconnect the user
- **Status:** Todo
- **Severity:** High · **Confidence:** Medium
- **Area:** Server — WHOOP OAuth
- **Location:** `server/src/controllers/whoop.ts:122-150`
- **Problem:** `freshAccessToken` refreshes without a lock; WHOOP rotates refresh tokens, so the second concurrent refresh uses a consumed token and fails; the loser may overwrite the winner's tokens. A failed refresh never marks the connection broken.
- **Impact:** Manual sync + cron (or two taps) → 400 "Whoop not connected"; possibly every later sync fails while the UI still says "connected".
- **Fix:** Serialize per user (row lock in `$transaction` and re-check `expiresAt`, or compare-and-swap `updateMany({where:{userId, refreshToken}})`). On 400/401 from refresh, flag `needsReauth` and return a distinct error the client turns into a "Reconnect" prompt.

### OE-020 — Book-node sync silently deletes user notes that have a bookId
- **Status:** Todo
- **Severity:** High · **Confidence:** High
- **Area:** Server — Learning / knowledge
- **Location:** `server/src/controllers/knowledge.ts:378, 424`; `server/src/services/bookNodes.ts:24-27, 59-64, 69-71`
- **Problem:** `createNode`/`updateNode` accept any `bookId`. `syncBookNodes` treats every node with a `bookId` as a book projection and deletes those not matching a live book; `removeBookNode` deletes all nodes with that `bookId`.
- **Impact:** PATCH a note with `bookId: "x"` (or a book later deleted) → on the next `GET /api/knowledge` the note and its edges are hard-deleted. Real book ids can overwrite note content.
- **Fix:** Stop accepting `bookId` from the client on knowledge nodes; only `syncBookNodes` sets it. Scope sync/delete to nodes with `legacyId = book:<id>` / `kind:'source'`.

---

## Medium

### OE-021 — Missing email claim or reused email bricks an account with permanent 500s
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server — ensureUser / schema
- **Location:** `server/src/middleware/auth.ts:75`; `server/src/middleware/ensureUser.ts:16`; `server/src/controllers/invite.ts:11, 48`; schema `User.email @unique`
- **Problem:** Falls back to `email || ''` while `email` is `@unique`; upserts key on `id` only. A second token with no email, or an account recreated with the same email and a new `sub`, hits P2002.
- **Impact:** That user gets a 500 on every request forever.
- **Fix:** Return 401 when the email claim is missing. On P2002 for email, pick a policy (re-link the existing row to the new id, or return a clear 409).
- **Related:** OE-001

### OE-022 — Async handlers without try/catch hang requests (export, WHOOP, nutrition, learning)
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server — error handling
- **Location:** `server/src/controllers/export.ts:9-17`; `whoop.ts:54, 89, 269-273` (incl. `verifyState` → `timingSafeEqual` length mismatch throws); `nutrition.ts:221-283`; `learning.ts:5-40`
- **Problem:** Express 4 doesn't forward rejected promises; these handlers have no try/catch, so any Prisma error becomes an unhandled rejection and no response is sent. `verifyState` throws a RangeError on a short signature, outside the callback's try.
- **Impact:** Requests hang until Vercel's timeout (504); the WHOOP callback never redirects to `/body?whoop=error`; in `claimNutritionXp` a failure after the claim row is created marks the day claimed with no XP and no retry.
- **Fix:** Add try/catch → 500 JSON to every listed handler (or an `asyncHandler` wrapper + global error middleware in `index.ts`). In `verifyState`, compare lengths first and move the call inside the try. Make the nutrition claim row + XP increment one `$transaction`.

### OE-023 — Recurring/one-time switch leaves stale completion state (XP farm)
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server — quests
- **Location:** `server/src/controllers/quests.ts:172-175`
- **Problem:** Changing `recurrence` keeps `completed`/`lastCompletedAt` as they were; each mode ignores the other's field.
- **Impact:** Complete one-time (+X) → switch to daily → complete (+X) → switch back: net XP gain each cycle. A habit turned one-time has zero steps and can never be reopened.
- **Fix:** Reject recurrence changes while completed for the current period, or revoke the outstanding award and reset both fields in the same transaction.
- **Related:** OE-004

### OE-024 — All server day/week/month boundaries are UTC midnight
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server — streak / habits / special quests / skill actions / nutrition / meal prep / WHOOP
- **Location:** `server/src/services/xp.ts:57, 98-101`; `server/src/controllers/gamification.ts:25-32`; `server/src/lib/specialQuests.ts:115-132`; `server/src/controllers/skillActions.ts:109`; `nutrition.ts:250-263`; `meal-prep.ts:8-14`; `whoop.ts:194, 253`
- **Problem:** Habit resets, `DailyActivity`, streak "today", special-quest period keys, the skill-action same-day multiplier, nutrition defaults, the meal-prep "current Monday" and WHOOP cycle/weight dates all use UTC.
- **Impact:** A UTC−3 user's habit completed at 22:00 counts for tomorrow, daily quests roll over at 21:00, the streak can break despite daily activity, WHOOP weight lands on tomorrow's row.
- **Fix:** Have the client send its IANA timezone (header, or a `User.timezone` setting) and compute all period boundaries through one shared helper. For WHOOP use the cycle's `timezone_offset`.
- **Related:** OE-015, OE-033, OE-063

### OE-025 — Invalid dates return 500 instead of 400 across the API
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server — weight / measurements / food entries / gym sessions / journal / lessons / knowledge
- **Location:** `server/src/controllers/weight.ts:13-14, 45`; `measurements.ts:54`; `food-entries.ts:16-20, 51-54, 72`; `gym-sessions.ts` (session date); `journal.ts:9-13, 49`; `lessons.ts:59`; `knowledge.ts:379, 425`
- **Problem:** `new Date(date)` on arbitrary input with no validity/format check; full ISO timestamps are truncated to their UTC date in `@db.Date` columns.
- **Impact:** `date:"foo"` → 500. A local-time timestamp from the evening lands on the next day and can collide with/overwrite tomorrow's weight row.
- **Fix:** Add a shared `parseCalendarDate(str)` that requires `/^\d{4}-\d{2}-\d{2}$/` and returns `new Date(\`${d}T00:00:00Z\`)`; return 400 otherwise. Apply to bodies and `start`/`end` query params everywhere listed.

### OE-026 — Gym session payloads aren't validated (bad muscle groups → 500, session lost)
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server — gym sessions
- **Location:** `server/src/controllers/gym-sessions.ts:75-79`
- **Problem:** `muscleGroups` isn't checked against the enum, deduped, or required to be an array; `sets`/`reps` have no upper bound (Int4).
- **Impact:** `["legs"]`, `["chest","chest"]` or `"chest"` → 500 and the whole session is lost.
- **Fix:** Require an array of `Object.values(MuscleGroup)`, dedupe with `new Set`, cap sets/reps (e.g. 1000), return 400 on violations.

### OE-027 — Open Food Facts lookup can hang and passes unvalidated nutriments through
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Server — barcode lookup
- **Location:** `server/src/controllers/food-entries.ts:97-128`
- **Problem:** `clearTimeout` runs when headers arrive, so a stalled body has no timeout. Nutriments are cast, not checked — OFF sometimes returns strings/null; `product_name.trim()` throws on non-strings.
- **Impact:** Hung serverless function; macros arrive as strings (`"7.2"`), so client math concatenates or the later POST 400s.
- **Fix:** Use `AbortSignal.timeout(5000)` covering `r.json()`. Coerce each nutriment with `Number()`, fall back to 0 when non-finite/negative, round sensibly; guard `product_name`.

### OE-028 — Any user can permanently poison a barcode's nutrition data for everyone
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server — CustomFoodProduct
- **Location:** `server/src/controllers/food-entries.ts:137-150, 162-232`
- **Problem:** `CustomFoodProduct` is global, first-write-wins, with no edit/delete and no scoping; the P2002 path returns the existing (possibly bogus) record as success.
- **Impact:** One user saves "Water, 0 kcal" for a common barcode OFF lacks → every user gets it forever.
- **Fix:** Prefer the requesting user's own product (add `createdByUserId` to lookups and a per-user unique), fall back to the shared one; let the creator edit; or add moderation if sharing stays.

### OE-029 — Meal prep "current week" is UTC on the server and plans can duplicate per week
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Server — meal prep
- **Location:** `server/src/controllers/meal-prep.ts:8-14, 21-23, 103, 259-260`
- **Problem:** `getMostRecentMonday()` uses the server's UTC date while plans are saved with the client's `weekStartDate`; no `@@unique([userId, weekStartDate])`; create is findFirst-then-create.
- **Impact:** Near midnight GET / grocery list return the wrong week. Two concurrent saves create two plans; edits land on an arbitrary one.
- **Fix:** Add `@@unique([userId, weekStartDate])` and use `upsert`. Accept an explicit `weekStart` query param on GET and the grocery list.
- **Related:** OE-009, OE-024

### OE-030 — Body forms default to the UTC date
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Body
- **Location:** `client/src/components/WeightForm.tsx:10`; `MeasurementForm.tsx:16`; `GymSessionForm.tsx:28`
- **Problem:** Default date = `new Date().toISOString().split('T')[0]`.
- **Impact:** Evening weigh-ins (west of UTC) default to tomorrow → 409 on tomorrow's real entry; gym sessions land on the wrong day, skewing soreness.
- **Fix:** Use the shared local-date helper from OE-015.

### OE-031 — Special Quest toggles don't refresh the Status hero card and roll back badly
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Status / SpecialQuestPanel
- **Location:** `client/src/pages/GamificationTab.tsx:137, 341`; `client/src/components/SpecialQuestPanel.tsx:203-214`
- **Problem:** The hero card shows `localStatus`, which the panel never refreshes. On error the panel restores a whole-board snapshot (wiping other toggles) and never reverses the optimistic XP.
- **Impact:** Ticking a special quest doesn't move the level ring/XP until reload. Tick A then B, A fails → B's check disappears though it succeeded, XP shown is wrong.
- **Fix:** Add an `onChanged` prop called after the PATCH settles (pass `fetchStatus`). On error, functionally revert only that quest and reverse XP (or `fetchBoard()`).
- **Related:** OE-012

### OE-032 — Status page doesn't refresh habits/special quests at the period rollover
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Status
- **Location:** `client/src/components/SpecialQuestPanel.tsx:201`; `client/src/pages/GamificationTab.tsx:131-133`
- **Problem:** Board and habit `completed` flags are fetched only on mount; installed PWAs stay open for days.
- **Impact:** After the reset, yesterday's habits still show done (first tap sends a no-op `/reset`); yesterday's special quests 404 or credit today's template.
- **Fix:** Refetch quests, board and status on `visibilitychange`/`focus` and on a timer at the next period boundary; refetch the board on a toggle 404.

### OE-033 — Special-quest toggle at a period boundary 404s or credits the wrong period
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Server — special quests
- **Location:** `server/src/controllers/special-quests.ts:78-98`
- **Problem:** The period key is recomputed from server time at toggle; no transaction around create/delete + XP; responses echo the requested value instead of stored state.
- **Impact:** Load at 23:59, tap at 00:00:30 → 404 or wrong period; un-toggling yesterday silently does nothing; a concurrent second request 500s (P2002/P2025); an XP failure after the row is created loses the XP permanently.
- **Fix:** Accept the `periodKey` from the list (current or immediately previous only). Do create/delete + XP in one `$transaction`; treat P2002/P2025 as idempotent success; return the actual stored state.

### OE-034 — Dragging a quest card also toggles it open/closed
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Client — Status / kanban
- **Location:** `client/src/components/QuestCard.tsx:57, 83`
- **Problem:** dnd-kit listeners are on the card root and the header has `onClick` toggle; the click after a mouse drag isn't suppressed.
- **Impact:** Drag a collapsed card to Done → it lands expanded (or an expanded one collapses).
- **Fix:** Set a `justDragged` ref when `isDragging` ends and ignore the next click, or move listeners to a dedicated drag handle.

### OE-035 — Optimistic temp-id quests, skills and practice actions are fully interactive
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Status / Skills
- **Location:** `client/src/pages/GamificationTab.tsx:153-164`; `client/src/components/QuestForm.tsx:322, 333`; `client/src/pages/SkillsTab.tsx:188-198`; `client/src/components/SkillActionList.tsx:104`
- **Problem:** Temp items can be dragged, completed, step-toggled, edited, deleted and logged before the POST resolves.
- **Impact:** Create a quest and tap ✓ → "Quest not found" toast + phantom XP; when the POST resolves the completion is wiped. Deleting a temp item brings it back.
- **Fix:** Treat `temp-` ids as pending; disable drag/buttons/checkboxes until the real id arrives (or queue and replay).

### OE-036 — "Overdue" uses the UTC date
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Status / QuestCard
- **Location:** `client/src/components/QuestCard.tsx:36`
- **Problem:** `today = new Date().toISOString().slice(0,10)`.
- **Impact:** UTC−3 quests due today are flagged Overdue from 21:00; UTC+ zones flag yesterday's late.
- **Fix:** Compare against the shared local-date helper (OE-015).

### OE-037 — 401 handler can loop a logged-in user back to /login
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Client — auth
- **Location:** `client/src/lib/apiClient.ts:25-28`; `client/src/pages/LoginPage.tsx:30`
- **Problem:** Any 401 hard-redirects to `/login` without clearing the Better Auth session; LoginPage never redirects an already-logged-in user; parallel 401s each set `location.href`.
- **Impact:** A valid cookie session whose JWT the API rejects gets bounced to /login repeatedly; every sign-in fails the same way.
- **Fix:** On 401, `authClient.signOut()` first, guard `location.pathname !== '/login'`, and use a module-level flag so only one redirect fires.

### OE-038 — Logout does nothing if signOut fails
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — auth
- **Location:** `client/src/contexts/AuthContext.tsx:62-65`
- **Problem:** `await authClient.signOut()` has no try/finally; a rejection skips the redirect and becomes an unhandled rejection.
- **Impact:** Logging out offline or during an auth-proxy outage leaves the user in the app.
- **Fix:** `try { await authClient.signOut(); } finally { window.location.href = '/login'; }`.

### OE-039 — Service worker caches error pages as the offline app shell
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — PWA / service worker
- **Location:** `client/public/sw.js:33-39`
- **Problem:** Navigation responses are cached as `/index.html` without checking `res.ok`; old hashed assets are never pruned; the cache name is bumped by hand.
- **Impact:** One navigation during a 500 → offline launches show the error page. Cache grows across deploys.
- **Fix:** Only `put` when `res.ok && res.type === 'basic'`. Prune assets not referenced by the current shell, or version the cache name at build time.

### OE-040 — Rapid meal-prep cell removals overwrite each other
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Client — Diet / meal prep
- **Location:** `client/src/pages/DietTab.tsx:174-195`
- **Problem:** Each removal POSTs a full plan and unconditionally applies its response; rollback restores a stale snapshot.
- **Impact:** Remove two cells quickly → one reappears (UI and DB can disagree); a failed first request restores both.
- **Fix:** Serialize removals (disable buttons while pending, or a request counter that only applies the newest response); on error, refetch the plan.
- **Related:** OE-009

### OE-041 — Optimistic temp-id food entries can be deleted before they exist
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Diet / food log
- **Location:** `client/src/pages/DietTab.tsx:147-155, 288-294`
- **Problem:** ✕ appears on `temp-` rows; DELETE 404s while the POST still goes through.
- **Impact:** "Food entry not found" toast, entry stays saved and reappears later.
- **Fix:** Disable delete for `temp-` ids (or record a pending delete and issue it with the real id).
- **Related:** OE-013

### OE-042 — Optimistic temp-id books are fully interactive
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Learning / books
- **Location:** `client/src/pages/LearningTab.tsx:48-56`; `client/src/components/BookForm.tsx:36`
- **Problem:** Status/delete/cover buttons work on `temp-` books → 404 → refetch drops the card mid-create.
- **Impact:** Add a book and tap "Reading" → error toast and flicker.
- **Fix:** Disable actions on `temp-` cards until the real id arrives.
- **Related:** OE-013

### OE-043 — Body tab rollbacks restore a stale whole-list snapshot
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Body
- **Location:** `client/src/pages/BodyTab.tsx:82-86, 91-95, 100-104, 109-113`
- **Problem:** Update/delete handlers capture `prev` from the render closure and `setX(prev)` on failure.
- **Impact:** Delete A (fails slowly) while deleting B (succeeds) → B reappears. Creates made in the meantime vanish or revert to temp rows.
- **Fix:** Targeted functional rollbacks (re-insert only the removed item / restore only the edited value), or refetch on error.

### OE-044 — Hevy JSON import isn't validated per exercise
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Body / GymSessionImport
- **Location:** `client/src/components/GymSessionImport.tsx:59-84`
- **Problem:** Only `date` and a non-empty `exercises` array are checked; `muscleGroups: "chest"` throws and shows "Invalid JSON"; textarea is cleared before the server responds.
- **Impact:** Cards flash with `undefined×undefined`, then a server 400 toast — and the pasted JSON is gone.
- **Fix:** Validate/coerce each exercise (name, integer sets/reps ≥1, weight ≥0, known muscle groups, parseable date), show the specific inline error (not a generic "Invalid JSON" — today a TypeError from `.map` on a non-array `muscleGroups` lands in the parse catch), keep the textarea content.

### OE-045 — Body forms lose all input when the save fails
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Body
- **Location:** `client/src/pages/BodyTab.tsx:72, 119, 133-134, 156`; `client/src/components/GymSessionForm.tsx:95-96`; `GymSessionImport.tsx:84`
- **Problem:** Forms close/clear before the POST resolves; on failure only a toast remains.
- **Impact:** A 6-exercise session typed offline is lost on Save.
- **Fix:** Keep the submitted body in parent state and reopen the form pre-filled on failure (or keep it open until success).

### OE-046 — GymSessionForm silently turns blank/invalid sets & reps into 1
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Body / GymSessionForm
- **Location:** `client/src/components/GymSessionForm.tsx:73-75`
- **Problem:** `parseInt(x) || 1` and `parseFloat(weight) || 0`; negatives pass through.
- **Impact:** A cleared reps field records 3×1 with no warning; −3 sets → server 400 after the form closed.
- **Fix:** Validate integer sets/reps ≥1 and weight ≥0 per named exercise with an inline error; don't fall back to defaults.

### OE-047 — Every create/delete of knowledge nodes, edges, journal and lessons farms XP
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server — Learning / knowledge / journal / lessons
- **Location:** `server/src/controllers/knowledge.ts:384, 449, 488, 506`; `journal.ts:58`; `lessons.ts:63`
- **Problem:** Creates award XP (12/node, 4/edge, 10/journal, 15/lesson); deletes never revoke; `awardXP`'s `source` isn't used to dedupe.
- **Impact:** Link/unlink the same two nodes repeatedly → unlimited XP and streak.
- **Fix:** `revokeXP` on delete (including cascaded manual edges on `deleteNode`), or record awards by source key and skip repeats.

### OE-048 — Books accept currentPage above totalPages
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server — Learning / books
- **Location:** `server/src/controllers/books.ts:126-132`
- **Problem:** Only non-negative is checked; when status and currentPage arrive together the status branch overwrites currentPage silently.
- **Impact:** "Reading — 99999/300", broken pace.
- **Fix:** 400 when `currentPage > totalPages`; optionally auto-finish when equal.

### OE-049 — ensureUser's in-memory cache ignores row deletion / future activation changes
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Server — ensureUser (serverless)
- **Location:** `server/src/middleware/ensureUser.ts:5, 11-14`
- **Problem:** The `knownUsers` Set is per instance and never evicted.
- **Impact:** A deleted user row → later writes 500 on FK errors on warm instances; once OE-001 lands, revocations wouldn't apply until a cold start.
- **Fix:** Short TTL cache including activation state, or drop the cache for a cheap `findUnique` select.
- **Related:** OE-001

### OE-050 — Auth proxy drops non-JSON and empty-JSON request bodies
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Server — authProxy
- **Location:** `server/src/controllers/authProxy.ts:30-37`; `server/src/index.ts:41`
- **Problem:** Only `express.json` runs, so form-encoded bodies arrive as `{}`; `{}` bodies (e.g. sign-out) are dropped; bodies are re-serialized, not forwarded raw.
- **Impact:** Form-posted auth flows (OAuth callbacks) reach Neon Auth with no body and a mismatched content-type.
- **Fix:** Mount `express.raw({type:'*/*'})` for `/api/auth-proxy/*` before `express.json` and forward the buffer unchanged.
- **Related:** OE-051, OE-068

### OE-051 — Auth proxy doesn't forward client IP (shared rate limits) and forwards our Origin
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Server — authProxy
- **Location:** `server/src/controllers/authProxy.ts:22-27`
- **Problem:** No `x-forwarded-for`/`x-real-ip`, so all auth traffic comes from Vercel egress IPs; `origin` is our domain, which Better Auth rejects unless trusted.
- **Impact:** One abuser can rate-limit sign-in for everyone (429s); sign-in 403s "invalid origin" if the app origin isn't in Neon Auth's trusted origins.
- **Fix:** Forward client IP headers. Document (in DEPLOY.md) that the app origin must be in Neon Auth trusted origins, or rewrite `origin` deliberately.
- **Related:** OE-050

### OE-052 — Meal-prep grocery list doesn't refresh after plan changes
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Diet / grocery list
- **Location:** `client/src/pages/DietTab.tsx:102-108, 165, 190, 336`
- **Problem:** `fetchGroceryList` only runs when the selected day changes; no stale-response guard; old list shown under the new day while loading.
- **Impact:** Remove Monday's dinner → its ingredients and kcal stay on the list.
- **Fix:** Refetch after every successful plan mutation (or depend on `mealPrepPlan`); clear on day change; ignore responses for a non-selected day.

### OE-053 — Grocery list doesn't scale per serving or merge duplicates
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Server — meal prep grocery list (+ Client — GroceryList)
- **Location:** `server/src/controllers/meal-prep.ts:321-330`; `client/src/components/GroceryList.tsx:45-50`
- **Problem:** Each entry pushes the recipe's whole-batch ingredient quantities; calories are per serving; no merging/normalization.
- **Impact:** A 4-serving chili for lunch + dinner lists "600 g beef" twice (1.2 kg for 2 servings).
- **Fix:** Divide numeric quantities by `recipe.servings`; merge by (lowercased name, unit), summing numeric quantities; keep non-numeric as separate lines.

### OE-054 — AI meal-plan import doesn't refresh recipes and hides its success message
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Diet / meal-prep AI import
- **Location:** `client/src/pages/DietTab.tsx:336`; `client/src/components/MealPlanImport.tsx:144-146`
- **Problem:** New recipes created by the import aren't fetched; `onImported` unmounts the panel before its "Imported N…" message renders.
- **Impact:** "+ Manual plan" dropdowns miss the imported recipes until reload; no success feedback.
- **Fix:** In `onImported`, call `fetchRecipes()` + grocery refresh and show a success toast with counts.

### OE-055 — "+ Manual plan" silently replaces the entire existing week
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Diet / meal prep
- **Location:** `client/src/components/MealPrepForm.tsx:29, 54-73`; `client/src/pages/DietTab.tsx:158-167`
- **Problem:** The form starts empty and posts only its selections; the server deletes all existing entries. Any date (not just Mondays) can be picked, and the response becomes "This Week" in the UI.
- **Impact:** After importing 21 meals, setting one slot manually deletes the other 20.
- **Fix:** Pre-fill from the current plan (or merge before posting), restrict to Mondays, and only set state when the response is the current week.

### OE-056 — Nutrition settings inputs save 0 on blur and swallow errors
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Diet / WeeklyNutritionChart
- **Location:** `client/src/components/WeeklyNutritionChart.tsx:119-126, 186, 194, 202`
- **Problem:** `onBlur` saves `Number(value)` unchecked (empty → 0) even when unchanged; `saveSettings` has no catch.
- **Impact:** Clearing "Protein g/kg" to retype it saves 0 and zeroes the protein target; server errors are invisible.
- **Fix:** Skip empty/non-finite/unchanged values; add a catch with a toast that resets the field.

### OE-057 — Recipe AI import sends float/string calories (400)
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Recipes / AI import
- **Location:** `client/src/components/RecipeImport.tsx:64, 80`
- **Problem:** `caloriesPerServing` isn't rounded/coerced; ingredients aren't cleaned.
- **Impact:** `"caloriesPerServing": 412.5` → card appears, then vanishes with an error.
- **Fix:** Use `toMacro(data.caloriesPerServing)`; keep only ingredients with a string `name`; `String()` quantity/unit.

### OE-058 — Learning stats count legacy tables instead of knowledge nodes
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server + Client — Learning / stats
- **Location:** `server/src/controllers/learning.ts:15-17`; `client/src/components/LearningStats.tsx:94-96`
- **Problem:** Notes/Lessons/Journal tiles count `note`, `lessonLearned`, `journalEntry`, but the UI now only creates `KnowledgeNode`s.
- **Impact:** Tiles never change after creating nodes.
- **Fix:** Count `knowledgeNode` grouped by `kind` for the user, excluding book projections.

### OE-059 — Book status changes on the client don't roll back or sync XP/progress
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Learning / books
- **Location:** `client/src/pages/LearningTab.tsx:57-65`
- **Problem:** `addXP(80)` is never undone on failure; un-finishing never subtracts; finish doesn't set `currentPage = totalPages`; `bumpStats()` runs before the PATCH resolves.
- **Impact:** Progress bar stuck at the old %, client XP climbs on finish→reading→finish cycles, stats read stale data.
- **Fix:** Await the PATCH, replace with the server response, adjust XP (or refresh status), then `bumpStats()`.
- **Related:** OE-012

### OE-060 — Knowledge graph scroll-zoom also scrolls the page
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Learning / KnowledgeGraph
- **Location:** `client/src/components/KnowledgeGraph.tsx:130-133, 185`
- **Problem:** React attaches `onWheel` as passive, so `preventDefault()` is ignored (console warning).
- **Impact:** Wheel/trackpad over the graph zooms and scrolls the page at once.
- **Fix:** Attach `wheel` in a `useEffect` with `{passive:false}` and remove it on cleanup.

### OE-061 — Knowledge node editor loses the draft on save failure
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Learning / KnowledgeSection
- **Location:** `client/src/components/KnowledgeSection.tsx:85-106`
- **Problem:** `setEditing(null)` runs before the request; on failure only a toast remains, and `onChanged()` still runs on edit failure.
- **Impact:** A long note written offline is lost on Save.
- **Fix:** Close the editor only on success; keep the draft on error.

### OE-062 — Training-program activation isn't atomic
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server — training programs
- **Location:** `server/src/controllers/training-programs.ts:125-144`
- **Problem:** `updateMany(active:false)` and `update(active:true)` run separately.
- **Impact:** Two concurrent activations can leave two active programs; a program deleted in between → none active + 500.
- **Fix:** Wrap in `prisma.$transaction([...])`; optionally add a partial unique index on `(userId) WHERE active`.

### OE-063 — WHOOP data is filed under the wrong local day
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Server — WHOOP sync
- **Location:** `server/src/controllers/whoop.ts:194, 253`
- **Problem:** Weight "today" is the server's UTC date; cycle dates use the UTC `start` instead of `timezone_offset`.
- **Impact:** A Brazil user syncing at 22:00 gets tomorrow's weight row; the day's TDEE misses that cycle.
- **Fix:** Derive local dates from the cycle's `timezone_offset` (or a stored user timezone) for both cycle rows and the weight row.
- **Related:** OE-024

### OE-064 — Weekly summary diet/XP figures and "completed this week" are wrong
- **Status:** Todo
- **Severity:** Medium · **Confidence:** Medium
- **Area:** Server — weekly summary
- **Location:** `server/src/controllers/weekly-summary.ts:46-53, 64-67, 136`
- **Problem:** Completed quests are filtered by `updatedAt`; habits count once via `lastCompletedAt`; XP excludes nutrition claims; diet compares against static `calorieGoal`, not the adaptive target.
- **Impact:** Renaming an old quest shows it as completed this week; a daily habit done 7× counts once.
- **Fix:** Filter on a completion timestamp (or an XP event log); include `nutritionXpClaim` XP; use the adaptive target.

### OE-065 — Sidebar hunter name/rank are hardcoded and the level-up overlay never fires
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Dashboard
- **Location:** `client/src/components/Dashboard.tsx:50, 98-99, 378`
- **Problem:** `setLevelUp` is never called; sidebar `hunterName = 'Hunter'` and `hunterRank = 'E'` are hardcoded despite Settings saving a hunter name and `rank.ts` existing.
- **Impact:** The level-up overlay never appears; the sidebar always says "Hunter / E-Rank".
- **Fix:** Read `status.hunterName` and `rankForLevel(status.level)`; when a refreshed level exceeds the previous one, set `levelUp` and clear it with a cleaned-up timer.
- **Related:** OE-012

### OE-066 — Validate xpReward as a bounded integer
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Server + Client — quests / skill actions
- **Location:** `server/src/controllers/quests.ts:65, 160`; `server/src/controllers/skillActions.ts:40, 70`; `client/src/components/QuestForm.tsx:471`; `HabitRow.tsx:63`; `SkillActionList.tsx:103, 162`
- **Problem:** Server only checks `typeof === 'number' && >= 0`; `1.5` → Prisma 500; no upper bound (Int4 overflow, self-chosen levels). Client `Number(value)` passes decimals/negatives; empty → 0; SkillActionList silently ignores 0/empty.
- **Impact:** Quest with XP 12.5 appears then disappears with a generic error; Add action does nothing with no message.
- **Fix:** Server: `Number.isInteger(x)` and a sane max (e.g. ≤10000), 400 otherwise. Client: validate with an inline error before the optimistic insert; add `step={1}`.

### OE-067 — Recipe category and Favorites filters can never match
- **Status:** Todo
- **Severity:** Medium · **Confidence:** High
- **Area:** Client — Recipes / filters
- **Location:** `client/src/pages/RecipesTab.tsx:23, 308-312`
- **Problem:** Filters use `category`, `favorite`, `tags`, `timeMinutes`, none of which exist on the `Recipe` model/API.
- **Impact:** Every pill except "All" shows "No recipes found" even with recipes saved.
- **Fix:** Hide the category/Favorites pills until the server supports those fields (real categories/favorites are FEAT-009).

---

## Low

### OE-068 — Auth proxy copies all upstream headers and doesn't rewrite redirects
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Server — authProxy
- **Location:** `server/src/controllers/authProxy.ts:11-13, 57-62`
- **Problem:** Only `Domain=` is stripped from cookies; `Location`, CORS, HSTS and CSP headers pass through unchanged.
- **Impact:** OAuth redirects send the browser to the auth domain; auth-domain security headers apply to our origin.
- **Fix:** Allowlist forwarded headers (`content-type`, `set-auth-jwt`, `set-auth-token`, `location`, `cache-control`); rewrite `Location` on `AUTH_BASE` to `/api/auth-proxy`.

### OE-069 — CORS allows any origin
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Server — index
- **Location:** `server/src/index.ts:36`
- **Problem:** `cors()` with no options; the cookie-based auth proxy also gets `*`, then upstream CORS headers on top.
- **Fix:** `cors({ origin: [APP_ORIGIN] })` and exclude `/api/auth-proxy/*` from CORS.

### OE-070 — Schema is applied with `--accept-data-loss` on every deploy
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Server — deploy / schema
- **Location:** `package.json:18`; `server/prisma/schema.prisma`
- **Problem:** Any rename/type change or new unique constraint silently drops production data during the build.
- **Fix:** Move to `prisma migrate deploy`, or at least drop `--accept-data-loss` so destructive changes fail the build.

### OE-071 — Missing indexes on hot per-user queries
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Server — schema
- **Location:** `server/prisma/schema.prisma` — FoodEntry, Measurement, GymSession, Quest, Skill, SkillAction, Book, Note, Feedback, InviteCode(createdById)
- **Problem:** Postgres doesn't auto-index FK columns; most queries filter by `userId` (often + `date`).
- **Fix:** `@@index([userId, date])` on FoodEntry, Measurement, GymSession; `@@index([userId])` on the other user-owned models.

### OE-072 — Duplicate DailyActivity index
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Server — schema
- **Location:** `server/prisma/schema.prisma` (DailyActivity)
- **Problem:** `@@index([userId, date])` duplicates `@@unique([userId, date])`.
- **Fix:** Remove the `@@index`.

### OE-073 — Quest steps array elements aren't validated
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Server — quests
- **Location:** `server/src/controllers/quests.ts:85-89, 123-126`
- **Problem:** `[1]`, `[null]`, `[""]` reach Prisma → 500 or blank steps.
- **Fix:** Require every step to be a non-empty trimmed string; 400 otherwise.

### OE-074 — Training-program payloads aren't shape-validated
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Server — training programs
- **Location:** `server/src/controllers/training-programs.ts:37-70`
- **Problem:** Non-string `name`, `null` days, non-array `exercises` → 500; duplicate `dayOfWeek` accepted.
- **Fix:** Require string name, object days, array exercises; reject duplicate days with 400.

### OE-075 — Soreness heatmap drops sessions from exactly 7 days ago and over-weights bodyweight reps
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Server — soreness
- **Location:** `server/src/controllers/gym-sessions.ts:104-110`; `server/src/services/soreness.ts:41-42`
- **Problem:** Cutoff keeps the time of day against `@db.Date` dates; bodyweight effort uses `reps`, so volume grows with reps².
- **Impact:** 3×50 air squats outweigh 3×5 @100 kg squats 5:1.
- **Fix:** Truncate `sevenDaysAgo` to UTC midnight; use a fixed effort constant (or latest bodyweight × factor) for bodyweight exercises.

### OE-076 — Food entry / recipe ingredient payloads return 500 on bad shapes
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Server — recipes
- **Location:** `server/src/controllers/recipes.ts:76-80`
- **Problem:** Ingredients aren't validated; `null` elements or numeric `quantity` → 500.
- **Impact:** `{quantity: 200}` (number) can't be saved.
- **Fix:** Filter/validate as `importMealPrepPlan` does: string name required, `String()` quantity/unit, default `''`.

### OE-077 — Un-finishing a book leaves finishedAt / currentPage stale
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Server — Learning / books
- **Location:** `server/src/controllers/books.ts:142-149`
- **Problem:** Moving finished → reading/want_to_read revokes XP but keeps `finishedAt` and `currentPage = totalPages`.
- **Impact:** Shows 100% and hides pace after moving back to "reading".
- **Fix:** On un-finish, set `finishedAt: null` (and leave or restore `currentPage`).

### OE-078 — Legacy knowledge import duplicates edges in reverse and links non-imported nodes
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Server — Learning / knowledge import
- **Location:** `server/src/controllers/knowledge.ts:356-383`
- **Problem:** Tag seeding runs over all nodes, unordered, so re-runs emit `b→a` after `a→b`; reports attempted, not created, edges.
- **Fix:** Seed only among nodes created in this run, normalize pairs (`a < b`), report `createMany(...).count`.

### OE-079 — Wiki-link edges don't resync when a node is created or renamed
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Server — Learning / knowledge
- **Location:** `server/src/controllers/knowledge.ts:170, 218-221`
- **Problem:** Only the edited node's outgoing edges are rebuilt.
- **Impact:** Creating "Foo" doesn't link existing `[[Foo]]` mentions; renaming leaves stale auto-edges.
- **Fix:** After create/rename, re-run `syncAutoEdges` on nodes whose content mentions the old or new `[[title]]`.

### OE-080 — Weight change chip uses unsorted data and shows "▼ 0 kg" in red
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Client — Body / weight header
- **Location:** `client/src/pages/BodyTab.tsx:181-208`; `client/src/components/WeightChart.tsx:40-42`
- **Problem:** First/latest are array positions (mixed date formats, stale rollbacks); zero change renders as a red decrease.
- **Fix:** Sort a memoized copy by timestamp before picking first/last; render a neutral "±0".

### OE-081 — Back-dated gym sessions appear at the top until reload
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — Body / GymSessionLog
- **Location:** `client/src/pages/BodyTab.tsx:132`
- **Problem:** New sessions are always prepended; the server sorts by date desc.
- **Fix:** Sort by date desc after insert and after the server swap.

### OE-082 — Body tab shows empty states when fetches fail
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — Body / loading
- **Location:** `client/src/pages/BodyTab.tsx:45-63`
- **Problem:** Every initial fetch swallows errors; failure looks like "no data".
- **Impact:** Users re-log existing data and hit 409s.
- **Fix:** Per-section "Couldn't load — retry" state or toast.

### OE-083 — WHOOP card misreports connection state on errors
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Client — Body / WhoopCard
- **Location:** `client/src/components/WhoopCard.tsx:64-67, 98-100`
- **Problem:** Disconnect ignores errors; any status error shows "Connect Whoop"; weight refresh only on `weightLogged`.
- **Fix:** Separate error from not-connected with a retry; only clear status on successful disconnect; refresh weights after any sync.

### OE-084 — Measurements "Log All" button only logs one measurement
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — Body / measurements
- **Location:** `client/src/pages/BodyTab.tsx:232`; `client/src/components/MeasurementForm.tsx`
- **Problem:** Label says "Log All"; the form logs one type and closes.
- **Fix:** Rename to "Log Measurement", or accept all five values and POST each with `Promise.allSettled`, reporting failures.

### OE-085 — Skills radar highlight matches by name, not id
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — Skills
- **Location:** `client/src/pages/SkillsTab.tsx:353`
- **Problem:** `findIndex(d => d.name === s.name)`; duplicate names collide.
- **Fix:** Include `id` in `radarData` and match on it.

### OE-086 — Skills grown via practice actions still warn they "can't grow"
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — Skills
- **Location:** `client/src/pages/SkillsTab.tsx:58, 141, 242, 299-305`
- **Problem:** "Unlinked" ignores practice actions, which also grow skills.
- **Fix:** Reword to "not linked to a quest/habit", or consider actions/`lastActivityAt` before warning.

### OE-087 — Dashboard XP toast timers and global addXP hook aren't cleaned up
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — Dashboard
- **Location:** `client/src/components/Dashboard.tsx:80, 90-92`
- **Problem:** Toast `setTimeout`s never cleared; `window.__ariseAddXP` set every render, never deleted.
- **Impact:** Calls after unmount (e.g. `/privacy`) hit a stale instance.
- **Fix:** Cleanup that deletes the global (if still ours) and clears timers; better, pass `addXP` via context.

### OE-088 — Weekly Summary defaults to the UTC date
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — Summary
- **Location:** `client/src/components/WeeklySummary.tsx:17`
- **Problem:** `toISOString().slice(0,10)`.
- **Impact:** UTC−3 on Sunday evening shows next week.
- **Fix:** Use the shared local-date helper (OE-015).

### OE-089 — LineChart breaks with 0 or 1 data points and collides gradient ids
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — UI / LineChart
- **Location:** `client/src/components/ui/LineChart.tsx:28-36`
- **Problem:** Divides by `length - 1`; empty data → Infinity/NaN paths; hard-coded `id="areaFill"`.
- **Impact:** One weigh-in → broken chart and console errors.
- **Fix:** Placeholder for 0 points, centre a single point, `useId()` for the gradient.

### OE-090 — Invite code "Copy" claims success even when the clipboard fails
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — InviteCodeAdmin
- **Location:** `client/src/components/InviteCodeAdmin.tsx:25`
- **Problem:** `navigator.clipboard.writeText` isn't awaited/caught; the "Copied" timer isn't cleaned up.
- **Fix:** Await in try/catch, toast on failure, clear the timer on unmount. (Duplicate codes on 5xx are fixed by OE-010.)

### OE-091 — Data export revokes the blob URL before the download starts (iOS)
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Client — DataExport
- **Location:** `client/src/components/DataExport.tsx:24-26`
- **Problem:** `URL.revokeObjectURL` runs right after `a.click()`.
- **Impact:** On iOS the CSV/JSON download can fail or be empty.
- **Fix:** Defer the revoke (`setTimeout(..., 1000)`).

### OE-092 — Feedback button has no Escape and is covered by toasts
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — FeedbackButton / ToastContext
- **Location:** `client/src/components/FeedbackButton.tsx:35-71`; `client/src/contexts/ToastContext.tsx:40`
- **Problem:** No Escape handler or focus return; the toast stack (bottom-right, z 1000) sits on top of the button (z 30).
- **Impact:** After any toast, tapping the feedback button on mobile dismisses the toast instead.
- **Fix:** Escape closes and returns focus; move toasts (bottom-left/top) or offset them above the button.

### OE-093 — Nutrition target shows stale eligibility and claims the wrong day
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Client — Diet / WeeklyNutritionChart XP claim
- **Location:** `client/src/components/WeeklyNutritionChart.tsx:85-88, 128-136`
- **Problem:** No out-of-order guard on `fetchTarget`; `claimXp` posts `selectedDate` rather than the shown data's date; errors swallowed.
- **Fix:** Track the latest requested date, claim `data.date`, toast on non-"not eligible" errors.

### OE-094 — Barcode scanner restarts the camera on every DietTab re-render
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Client — Diet / BarcodeScanner
- **Location:** `client/src/components/BarcodeScanner.tsx:23-40`; `client/src/pages/DietTab.tsx:366-369`
- **Problem:** Effect depends on an inline `onDetected` prop; detection can fire multiple times before unmount.
- **Impact:** Camera flickers/re-initializes when a toast appears mid-scan.
- **Fix:** Keep `onDetected` in a ref, run the effect once, stop `controls` on the first result.

### OE-095 — Barcode grams field can't be cleared
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — Diet / BarcodeFoodForm
- **Location:** `client/src/components/BarcodeFoodForm.tsx:222`
- **Problem:** `setGrams(Number(value))` turns empty into 0 immediately.
- **Impact:** Field shows "0250"; preview drops to 0 kcal.
- **Fix:** Hold grams as a string, parse for scaling, validate `> 0` on submit.

### OE-096 — Recipe search shows stale results
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Client — Recipes / search
- **Location:** `client/src/pages/RecipesTab.tsx:267-279`
- **Problem:** Fetch per keystroke, no debounce or stale-response guard; create/import refetch with the active search.
- **Fix:** Debounce ~250 ms and apply only the latest term's response (ref or AbortController).

### OE-097 — Knowledge graph: dragging a node also opens it; possible double simulation loop
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Client — Learning / KnowledgeGraph
- **Location:** `client/src/components/KnowledgeGraph.tsx:67-78, 221-222`
- **Problem:** Node `onPointerUp` always selects; `wake()` has no running guard and can start a loop the effect cleanup won't cancel.
- **Fix:** Select only when pointer moved < ~4px; return early from `wake` if a loop is running (shared `runningRef` cleared on cleanup).

### OE-098 — Knowledge list search only matches titles
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Client — Learning / KnowledgeSection
- **Location:** `client/src/components/KnowledgeSection.tsx:68-79`
- **Problem:** Placeholder promises full search, filter matches `title` only; tag match is case-sensitive.
- **Fix:** Server-side `?q=` over title/content/tags, or include a content snippet in the payload.

### OE-099 — Knowledge graph off-centre on first paint/rotate; long titles overflow the panel
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Client — Learning / KnowledgeGraph / NodePanel
- **Location:** `client/src/components/KnowledgeGraph.tsx:188`; `client/src/components/KnowledgeNodePanel.tsx:91`
- **Problem:** Transform reads `clientWidth` during render (0 at first); title has no `overflowWrap`.
- **Fix:** Track width with a ResizeObserver in state; add `overflowWrap: 'anywhere'` to titles and Markdown paragraphs/links.

### OE-100 — Markdown renderer mangles snake_case and allows protocol-relative links
- **Status:** Todo
- **Severity:** Low · **Confidence:** Medium
- **Area:** Client — UI / Markdown
- **Location:** `client/src/components/ui/Markdown.tsx:20`
- **Problem:** `_([^_]+)_` italicizes inside words; `safeHref` accepts `//evil.com`; `[[Wiki]]` renders as literal brackets.
- **Fix:** Require word boundaries for `_` emphasis; reject `//` in `safeHref`; optionally render `[[Title]]` as a node link.

### OE-101 — WeightChart UTC-label test fails now that its fixture date is out of range
- **Status:** Todo
- **Severity:** Low · **Confidence:** High
- **Area:** Client — tests / WeightChart
- **Location:** `client/src/components/WeightChart.test.tsx` ("labels points by their UTC date, not the browser's local timezone")
- **Problem:** The test can't find the "Aug 19" label anymore. It fails on `main` too, so it's date-dependent rather than a regression — most likely its fixture dates fall outside the chart's default time-range window now that "today" has moved on.
- **Impact:** The client suite is red on every branch, which hides real failures.
- **Fix:** Freeze time in the test (`vi.useFakeTimers()` + `vi.setSystemTime(...)`) or build fixture dates relative to today, and keep asserting the UTC-vs-local labelling it was written for.
