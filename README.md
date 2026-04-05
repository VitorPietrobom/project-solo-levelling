# Project Arise

A personal growth web application that centralizes self-improvement tracking across multiple life domains with RPG-style gamification mechanics.

## Tech Stack

- **Frontend**: React + TypeScript, Vite, Tailwind CSS (dark theme), Recharts
- **Backend**: Express + TypeScript, Prisma ORM
- **Database**: Supabase-hosted PostgreSQL
- **Auth**: Supabase Auth (JWT verified locally on the server)
- **Testing**: Vitest + fast-check, React Testing Library, Supertest

## Features

### Gamification Tab
- **Level System** — XP progression with level formula, progress bars
- **Quests** — Kanban board (To Do / In Progress / Done) with multi-step quests that award XP on completion
- **Daily & Weekly Tasks** — Recurring tasks with automatic reset, XP rewards
- **Skills** — Independent skill leveling with radar/spider chart visualization, XP logging

### Body Tab
- **Weight Tracking** — Recharts line graph with 7D/30D/90D/All range selector, change indicators
- **Body Measurements** — SVG body silhouette with measurement lines (chest, waist, hips, arms, thighs)
- **Gym Sessions** — Import from Hevy via AI-generated JSON, bodyweight exercise support, session delete
- **Muscle Soreness** — Color-coded grid based on recency-weighted exercise volume (last 7 days)
- **Training Programs** — Weekly program view with day tabs, activate/deactivate, create/delete

### Diet Tab
- **Calorie Tracking** — Daily summary with goal progress bar, meal type breakdown, macro tracking (protein/carbs/fat)
- **Food Log** — Manual entry or AI-powered JSON import for quick meal logging
- **Recipes** — CRUD with ingredient management, search by name/ingredient, AI import
- **Meal Prep** — Weekly grid planner (7 days × 4 meals), recipe assignment, grocery list per day with calorie totals

### Learning Tab
- **Book Tracker** — Kanban board (Want to Read / Reading / Finished), page progress, skill XP on completion
- **Learning Journal** — Timeline view grouped by date, tags, skill links
- **Lessons Learned** — Searchable knowledge base with tags and skill links
- **Notes Wiki** — Personal knowledge base with create/edit/view, markdown content, tags, search

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)

### Environment Variables

**server/.env:**
```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret"
JWT_SECRET="any-random-string"
```

**client/.env:**
```env
VITE_SUPABASE_URL=https://[ref].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### Install & Run

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Push database schema
cd ../server && npx prisma db push

# Start server (terminal 1)
cd server && npx ts-node src/index.ts

# Start client (terminal 2)
cd client && npm run dev
```

### Run Tests

```bash
# Server tests
cd server && npx vitest run

# Client tests
cd client && npx vitest run
```

## Architecture

- **Optimistic UI** — All create/update/delete operations update the UI instantly, sync with the server in the background, and rollback on failure
- **Presentational Components** — List/Form components receive data and callbacks as props. Tab containers own state and handle API calls
- **Auth Middleware** — Local JWT verification (fast) with Supabase API fallback. `ensureUser` middleware auto-creates the User row on first request
- **Session Pooler** — Database queries go through Supabase's session pooler (port 5432) for persistent connections. Migrations use the direct URL

## AI Integration

The app includes AI prompt templates for importing data from external tools:

- **Hevy Gym Import** — Screenshot your Hevy workout → paste into ChatGPT/Claude with the provided prompt → paste JSON back into the app
- **Food Log Import** — Describe your meal or send a photo → AI estimates calories and macros → paste JSON
- **Recipe Import** — Describe a recipe or send a photo → AI generates structured recipe JSON with ingredients and steps
