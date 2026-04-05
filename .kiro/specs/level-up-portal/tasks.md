# Implementation Plan: Level Up Portal

## Overview

Build a personal growth web application with React+TypeScript frontend, Express+TypeScript backend, Supabase-hosted PostgreSQL with Prisma, Tailwind CSS dark theme, Recharts charts, Supabase Auth, and Vitest+fast-check testing. Tasks are ordered so each step builds on the previous, with no orphaned code.

### Implementation Patterns (established in tasks 1–5)

All remaining UI tasks MUST follow these patterns:

- **Auth**: Supabase Auth handles signup/login. Server middleware verifies Supabase JWTs locally (fast path) with fallback to `supabase.auth.getUser()`. `ensureUser` middleware auto-creates the User row on first request. No bcrypt/custom JWT on the server.
- **Optimistic UI**: Tab containers (e.g., GamificationTab) own the data state. Forms build an optimistic object with a `temp-${Date.now()}` ID, add it to state immediately, then POST in the background. On success, swap the temp object with the server response via `setItems(prev => prev.map(…))`. On failure, remove the temp object. No refetch — swap in place.
- **Presentational components**: List/Form components receive data and callbacks as props. No internal fetch logic. The parent tab container fetches data in `useEffect` and passes it down.
- **Step/toggle actions**: Update state optimistically first, then fire the API call. On error, refetch from server to rollback.
- **Backend routes**: All protected routes use `authMiddleware` then `ensureUser` middleware chain.
- **Prisma queries**: Use `'asc' as const` for orderBy to satisfy TypeScript strict mode.
- **API client**: Uses Supabase session token from `supabase.auth.getSession()` for Authorization header. Retries mutations once on failure.

## Tasks

- [x] 1. Project scaffolding and shared configuration
  - [x] 1.1 Initialize monorepo with `client/` and `server/` directories, shared `tsconfig` base, and package.json scripts
    - Set up Vite for the React client, ts-node/nodemon for the Express server
    - Install core dependencies: React, React Router, Express, Prisma, Tailwind CSS, Recharts, bcrypt, jsonwebtoken, vitest, fast-check, supertest, @testing-library/react
    - _Requirements: 16.1, 16.4_
  - [x] 1.2 Configure Tailwind CSS dark theme with CSS custom properties
    - Define all theme tokens from the design (--bg-primary, --bg-secondary, --bg-card, --text-primary, --text-secondary, accent colors, --border-color)
    - Configure heat map color scale tokens
    - _Requirements: 16.1, 16.2, 16.5_
  - [x] 1.3 Set up Prisma schema with all data models and relations
    - Define User, Quest, QuestStep, Task, Skill, WeightEntry, Measurement, GymSession, Exercise, ExerciseMuscleGroup, TrainingProgram, ProgramDay, ProgramExercise, FoodEntry, Recipe, Ingredient, MealPrepPlan, MealPrepEntry, Document
    - Add unique constraints: User.email, WeightEntry(userId, date), MealPrepEntry(planId, dayOfWeek, mealType)
    - Generate Prisma client and run initial migration
    - _Requirements: 17.1_
  - [x] 1.4 Set up Vitest configuration for both client and server with fast-check integration
    - _Requirements: (testing infrastructure)_

- [x] 2. Authentication backend and frontend
  - [x] 2.1 Implement auth controller and JWT middleware on the server
    - POST `/api/auth/login` — validate credentials with bcrypt, return JWT
    - POST `/api/auth/logout` — invalidate session
    - GET `/api/auth/me` — return current user from token
    - Auth middleware: validate JWT on all protected routes, return 401/403 appropriately
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 2.2 Implement shared API client with retry logic on the frontend
    - Wrap fetch with Authorization header injection, 401 redirect to login, toast notifications for 4xx/5xx
    - Implement single automatic retry on save failures (POST, PUT, PATCH, DELETE)
    - _Requirements: 17.2, 17.3_
  - [ ]* 2.3 Write property test for save retry on failure
    - **Property 28: Save retry on failure**
    - **Validates: Requirements 17.3**
  - [x] 2.4 Implement LoginPage and AuthContext on the frontend
    - LoginPage with email/password form, error display, redirect on success
    - AuthContext providing auth state, login/logout functions, JWT storage
    - Protected route wrapper that redirects unauthenticated users to login
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 17.4_
  - [x] 2.5 Implement Dashboard layout with TabNavigation
    - Horizontal tab bar: Gamification, Body, Diet, Learning
    - Active tab highlighted with accent color, route-based tab switching
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Checkpoint — Auth and navigation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. XP service and gamification core
  - [x] 4.1 Implement XP service with level formula and progress calculation
    - `awardXP(userId, amount, source)` — increment user totalXP, return new level/progress
    - `getCurrentLevel(totalXP)` — highest N where 50*N*(N+1) ≤ totalXP
    - `getXPForNextLevel(currentLevel)` — returns 100 * (currentLevel + 1)
    - `getProgressToNextLevel(totalXP)` — returns { current, required, percentage }
    - Same formula applies to skill-level calculations
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 4.2 Write property test for level and progress calculation
    - **Property 1: Level and progress calculation**
    - **Validates: Requirements 3.3, 3.4, 6.3**
  - [ ]* 4.3 Write property test for XP award on completion
    - **Property 2: XP award on completion**
    - **Validates: Requirements 3.2, 4.3, 5.4**
  - [x] 4.4 Implement gamification status endpoint and LevelDisplay component
    - GET `/api/gamification/status` — return level, totalXP, progress
    - LevelDisplay component with XP progress bar using accent color fill
    - _Requirements: 3.1, 3.4_

- [x] 5. Quests
  - [x] 5.1 Implement quest CRUD endpoints
    - GET `/api/quests` — list all quests with steps
    - POST `/api/quests` — create quest with title, description, steps, xpReward
    - PATCH `/api/quests/:id/steps/:stepId` — mark step complete; auto-complete quest and award XP when all steps done
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 5.2 Write property test for quest creation round-trip
    - **Property 3: Quest creation round-trip**
    - **Validates: Requirements 4.1**
  - [ ]* 5.3 Write property test for quest step completion updates progress
    - **Property 4: Quest step completion updates progress**
    - **Validates: Requirements 4.2, 4.3**
  - [x] 5.4 Implement QuestList, QuestForm, and quest step UI components
    - QuestList showing active quests with progress indicators
    - QuestForm for creating quests with title, description, and dynamic step list
    - Step completion toggles that call the PATCH endpoint
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Daily and weekly tasks
  - [x] 6.1 Implement task CRUD and completion endpoints
    - GET `/api/tasks` — list tasks with computed completedToday based on lastCompletedAt and recurrence
    - POST `/api/tasks` — create task with title, recurrence (daily/weekly), xpReward
    - PATCH `/api/tasks/:id/complete` — mark complete, set lastCompletedAt, award XP via XP service
    - Daily reset: completedToday is false if lastCompletedAt is before today
    - Weekly reset: completedToday is false if lastCompletedAt is before current week start (Monday)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 6.2 Write property test for task reset by period
    - **Property 5: Task reset by period**
    - **Validates: Requirements 5.2, 5.3**
  - [x] 6.3 Implement TaskList and TaskForm UI components
    - TaskList: presentational component receiving tasks and onToggle callback as props. Shows daily and weekly tasks with completion toggles
    - TaskForm: builds optimistic task object, calls parent's onCreated callback. Parent handles API call and state swap
    - Parent (GamificationTab) owns task state, fetches on mount, handles optimistic create/toggle
    - _Requirements: 5.1, 5.5_

- [x] 7. Skills
  - [x] 7.1 Implement skill CRUD and activity logging endpoints
    - GET `/api/skills` — list skills with level and progress (using same level formula as global XP)
    - POST `/api/skills` — create skill with name, initial level 1, 0 XP
    - POST `/api/skills/:id/log` — log activity, add XP to skill totalXP
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 7.2 Write property test for skill creation initial state
    - **Property 6: Skill creation initial state**
    - **Validates: Requirements 6.1**
  - [ ]* 7.3 Write property test for skill XP accumulation
    - **Property 7: Skill XP accumulation**
    - **Validates: Requirements 6.2**
  - [x] 7.4 Implement SkillList and SkillForm UI components
    - SkillList: presentational component receiving skills as props, shows all skills with individual level bars
    - SkillForm: builds optimistic skill object, calls parent's onCreated callback. Logging activity uses optimistic XP update
    - _Requirements: 6.1, 6.4_
  - [x] 7.5 Wire GamificationTab container with all gamification sub-components
    - GamificationTab owns all state: quests, tasks, skills. Fetches each on mount
    - Compose LevelDisplay, QuestList, TaskList, SkillList as presentational children
    - All create/toggle handlers follow optimistic pattern: update state → fire API → swap or rollback
    - _Requirements: 3.1, 4.4, 5.5, 6.4_

- [x] 8. Checkpoint — Gamification tab complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Weight tracking
  - [x] 9.1 Implement weight entry endpoints
    - GET `/api/weight?start=&end=` — list weight entries with date range filtering
    - POST `/api/weight` — log weight entry (enforce unique userId+date, return 409 on duplicate)
    - _Requirements: 7.1, 7.3_
  - [ ]* 9.2 Write property test for weight entry round-trip and date filtering
    - **Property 8: Weight entry round-trip and date filtering**
    - **Validates: Requirements 7.1, 7.3**
  - [x] 9.3 Implement WeightChart and WeightForm UI components
    - WeightChart: presentational, receives entries as props. Recharts line graph with time range selector
    - WeightForm: builds optimistic entry, calls parent's onCreated. Parent handles API + state swap
    - Display most recent entry and change from previous
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 9.4 Write property test for numeric entry change calculation
    - **Property 9: Numeric entry change calculation**
    - **Validates: Requirements 7.4, 8.4**

- [x] 10. Body measurements
  - [x] 10.1 Implement measurement endpoints
    - GET `/api/measurements?type=` — list measurements, filterable by type
    - POST `/api/measurements` — log measurement with type, value, date
    - _Requirements: 8.1, 8.2, 8.3_
  - [ ]* 10.2 Write property test for measurement round-trip and type filtering
    - **Property 10: Measurement round-trip and type filtering**
    - **Validates: Requirements 8.1, 8.3**
  - [x] 10.3 Implement MeasurementList and MeasurementForm UI components
    - MeasurementList: presentational, receives measurements as props. Shows latest per type with change indicators
    - MeasurementForm: builds optimistic measurement, calls parent's onCreated
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11. Gym sessions and soreness heat map
  - [x] 11.1 Implement gym session endpoints
    - GET `/api/gym-sessions` — list recent sessions with exercises and muscle groups
    - POST `/api/gym-sessions` — log session with date, notes, exercises (name, sets, reps, weight, muscle groups)
    - GET `/api/gym-sessions/heatmap` — return soreness data per muscle group
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 11.2 Implement soreness calculator service
    - For each muscle group, sum volume (sets × reps × weight) from last 7 days, weighted by recency
    - Normalize to 0–100 scale
    - _Requirements: 9.4_
  - [ ]* 11.3 Write property test for gym session round-trip
    - **Property 11: Gym session round-trip**
    - **Validates: Requirements 9.1, 9.2**
  - [ ]* 11.4 Write property test for soreness calculation bounds and monotonicity
    - **Property 12: Soreness calculation bounds and monotonicity**
    - **Validates: Requirements 9.4**
  - [x] 11.5 Implement GymSessionLog, GymSessionForm, and MuscleHeatMap UI components
    - All presentational, receiving data as props from BodyTab parent
    - GymSessionLog: list of recent sessions
    - GymSessionForm: log session with dynamic exercise rows, muscle group multi-select. Optimistic create pattern
    - MuscleHeatMap: SVG body diagram with color-coded soreness using heat map color scale
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [x] 12. Training programs
  - [x] 12.1 Implement training program endpoints
    - GET `/api/training-programs` — list programs
    - POST `/api/training-programs` — create program with name, days, exercises per day
    - PATCH `/api/training-programs/:id/activate` — set active (deactivate all others for user)
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [ ]* 12.2 Write property test for training program round-trip and day filtering
    - **Property 13: Training program round-trip and day filtering**
    - **Validates: Requirements 10.1, 10.3**
  - [ ]* 12.3 Write property test for active training program invariant
    - **Property 14: Active training program invariant**
    - **Validates: Requirements 10.4**
  - [x] 12.4 Implement TrainingProgramView, TrainingProgramForm UI components
    - All presentational, receiving data as props from BodyTab parent
    - TrainingProgramView: weekly display with day-by-day exercises
    - TrainingProgramForm: create/edit program with day/exercise assignment. Optimistic create pattern
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 12.5 Wire BodyTab container with all body sub-components
    - BodyTab owns all state: weight entries, measurements, gym sessions, heatmap data, training programs. Fetches each on mount
    - Compose WeightChart, MeasurementList, GymSessionLog, MuscleHeatMap, TrainingProgramView as presentational children
    - All create handlers follow optimistic pattern
    - _Requirements: 7.2, 8.3, 9.3, 9.5, 10.2_

- [ ] 13. Checkpoint — Body tab complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Calorie tracking
  - [ ] 14.1 Implement food entry and calorie goal endpoints
    - GET `/api/food-entries?date=` — list food entries for a date
    - POST `/api/food-entries` — log food entry with name, calories, mealType, date
    - GET `/api/calorie-goal` — get daily calorie goal
    - PUT `/api/calorie-goal` — set daily calorie goal (client-side validation prevents negative)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [ ]* 14.2 Write property test for food entry round-trip
    - **Property 15: Food entry round-trip**
    - **Validates: Requirements 11.1**
  - [ ]* 14.3 Write property test for calorie breakdown and remaining calculation
    - **Property 16: Calorie breakdown and remaining calculation**
    - **Validates: Requirements 11.2, 11.3, 11.4**
  - [ ] 14.4 Implement CalorieTracker and FoodEntryForm UI components
    - All presentational, receiving data as props from DietTab parent
    - CalorieTracker: daily summary with goal progress, breakdown by meal type
    - FoodEntryForm: builds optimistic food entry, calls parent's onCreated. Optimistic create pattern
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 15. Recipes
  - [ ] 15.1 Implement recipe CRUD and search endpoints
    - GET `/api/recipes?search=` — list/search recipes by name or ingredient (case-insensitive)
    - POST `/api/recipes` — create recipe with name, ingredients, steps, caloriesPerServing
    - GET `/api/recipes/:id` — get full recipe detail
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - [ ]* 15.2 Write property test for recipe round-trip
    - **Property 17: Recipe round-trip**
    - **Validates: Requirements 12.1**
  - [ ]* 15.3 Write property test for recipe search correctness
    - **Property 18: Recipe search correctness**
    - **Validates: Requirements 12.4**
  - [ ] 15.4 Implement RecipeList, RecipeDetail, and RecipeForm UI components
    - All presentational, receiving data as props from DietTab parent
    - RecipeList: browsable/searchable recipe collection
    - RecipeDetail: full recipe view with ingredients, steps, nutrition
    - RecipeForm: builds optimistic recipe, calls parent's onCreated. Optimistic create pattern
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 16. Meal prep planning
  - [ ] 16.1 Implement meal prep endpoints
    - GET `/api/meal-prep` — get current week's plan with entries
    - POST `/api/meal-prep` — create/update meal prep plan (weekStartDate must be Monday)
    - GET `/api/meal-prep/:day/grocery-list` — aggregate ingredients from assigned recipes for a day
    - Calculate daily estimated calories from assigned recipe caloriesPerServing
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [ ]* 16.2 Write property test for meal prep plan round-trip
    - **Property 19: Meal prep plan round-trip**
    - **Validates: Requirements 13.1**
  - [ ]* 16.3 Write property test for meal prep daily calorie calculation
    - **Property 20: Meal prep daily calorie calculation**
    - **Validates: Requirements 13.3**
  - [ ]* 16.4 Write property test for grocery list aggregation
    - **Property 21: Grocery list aggregation**
    - **Validates: Requirements 13.4**
  - [ ] 16.5 Implement MealPrepPlan, MealPrepForm, and GroceryList UI components
    - All presentational, receiving data as props from DietTab parent
    - MealPrepPlan: weekly grid (days × meal types) with assigned recipes
    - MealPrepForm: assign recipes to day/meal slots. Optimistic create pattern
    - GroceryList: combined ingredient list for a selected day
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [ ] 16.6 Wire DietTab container with all diet sub-components
    - DietTab owns all state: food entries, calorie goal, recipes, meal prep plan. Fetches each on mount
    - Compose CalorieTracker, RecipeList, MealPrepPlan as presentational children
    - All create handlers follow optimistic pattern
    - _Requirements: 11.2, 12.2, 13.2_

- [ ] 17. Checkpoint — Diet tab complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Learning document hub
  - [ ] 18.1 Implement document upload and retrieval endpoints
    - GET `/api/documents?search=` — list/search documents by title or category (case-insensitive)
    - POST `/api/documents` — upload document (multipart form, validate PDF/Markdown format, reject others with 400)
    - GET `/api/documents/:id` — get/download document file
    - GET `/api/documents/categories` — list distinct categories
    - Store files in Supabase Storage, store metadata in DB
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  - [ ]* 18.2 Write property test for document round-trip
    - **Property 22: Document round-trip**
    - **Validates: Requirements 14.1**
  - [ ]* 18.3 Write property test for document format validation
    - **Property 23: Document format validation**
    - **Validates: Requirements 14.2**
  - [ ]* 18.4 Write property test for document grouping by category
    - **Property 24: Document grouping by category**
    - **Validates: Requirements 14.3**
  - [ ]* 18.5 Write property test for document search correctness
    - **Property 25: Document search correctness**
    - **Validates: Requirements 14.5**
  - [ ] 18.6 Implement DocumentList, DocumentUpload, and DocumentViewer UI components
    - All presentational, receiving data as props from LearningTab parent
    - DocumentList: documents organized by category with search
    - DocumentUpload: upload form with title, category, file input (PDF/Markdown only). Optimistic create pattern
    - DocumentViewer: inline Markdown rendering, download link for PDFs
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  - [ ] 18.7 Wire LearningTab container
    - LearningTab owns all state: documents, categories. Fetches on mount
    - Compose DocumentList, DocumentUpload, DocumentViewer as presentational children
    - Upload handler follows optimistic pattern
    - _Requirements: 14.3_

- [ ] 19. Checkpoint — Learning tab complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Weekly summary
  - [ ] 20.1 Implement weekly summary endpoint
    - GET `/api/weekly-summary?weekOf=` — generate Markdown summary for the past 7 days
    - Query all tabs' data: XP earned, levels gained, quests completed, tasks completed, skill progress, weight changes, measurements, gym sessions, muscle groups, average daily calories, meal prep adherence, new recipes, documents uploaded, categories updated
    - Format as structured Markdown with section headers for Gamification, Body, Diet, Learning
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  - [ ]* 20.2 Write property test for weekly summary content and format
    - **Property 26: Weekly summary content and format**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6**
  - [ ] 20.3 Implement WeeklySummary UI component
    - Display generated Markdown summary
    - Copy-to-clipboard button
    - _Requirements: 15.6, 15.7_

- [ ] 21. Dark theme polish and contrast validation
  - [ ] 21.1 Apply consistent dark theme styling across all tabs, modals, forms, and navigation
    - Ensure charts and heat map use legible color palettes on dark backgrounds
    - Verify accent colors on interactive elements, progress bars, XP indicators, active tabs
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  - [ ]* 21.2 Write property test for theme color contrast
    - **Property 27: Theme color contrast**
    - **Validates: Requirements 16.5**

- [ ] 22. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Replace body SVG diagrams with proper artwork
  - User to provide a body SVG file
  - Replace the measurement diagram silhouette with the provided SVG, wire measurement lines to correct body positions
  - Replace the soreness diagram with the provided SVG, color muscle group regions based on heatmap data
  - Both diagrams should use the same base SVG for consistency

- [ ] 24. Add activity tracking for cardio and sports (volleyball, running, etc.)
  - Add an Activity model (type: cardio/sport, name, duration in minutes, calories burned, date)
  - Log activities like volleyball, running, cycling, swimming alongside gym sessions
  - Show activities in the Body tab with a weekly summary (total minutes, calories)
  - Factor activities into the soreness/recovery view (e.g., volleyball → legs, shoulders)
  - Consider Hevy JSON import support for cardio sessions too

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each major tab
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The tech stack is TypeScript throughout: React+Vite frontend, Express backend, Prisma ORM, Vitest+fast-check testing
- Auth uses Supabase Auth (not custom JWT/bcrypt). Server verifies tokens locally with fallback to Supabase API
- All UI components are presentational (props in, callbacks out). Tab containers own state and handle API calls
- All create/update operations use optimistic UI: instant state update → background API call → swap temp with real on success, remove on failure
- Database uses Supabase PostgreSQL via session pooler (port 5432) for queries and direct URL for migrations
- `ensureUser` middleware caches known user IDs in memory to avoid DB upsert on every request
