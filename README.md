# Project Arise

A personal growth web application that centralizes self-improvement tracking across multiple life domains with RPG-style gamification mechanics.

## Tech Stack

- **Frontend**: React + TypeScript, Vite, Tailwind CSS (dark theme), Recharts
- **Backend**: Express + TypeScript, Prisma ORM
- **Database**: Neon-hosted PostgreSQL (Prisma)
- **Auth**: Neon Auth (Better Auth; EdDSA JWTs verified on the server via JWKS)
- **Testing**: Vitest + fast-check, React Testing Library, Supertest

## Features

### Gamification Tab
- **Level System** — XP progression with level formula, progress bars
- **Quest Board** — 3 daily quests picked per user, 3 weekly and 2 monthly shared by everyone, refreshed automatically each period with no manual reset needed
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
- **Weekly Nutrition Dashboard** — 7-day calorie/macro bars, consumed-vs-remaining toggle, adaptive TDEE-based targets, daily nutrition XP claim
- **Food Log** — Manual entry, AI-powered JSON import, or live barcode scanning (Open Food Facts, with a community-editable fallback for products it doesn't have)
- **Recipes** — CRUD with ingredient management, search by name/ingredient, AI import
- **Meal Prep** — Weekly grid planner (7 days × 4 meals), recipe assignment, per-meal removal, week totals, grocery list per day with calorie totals

### Learning Tab
- **Book Tracker** — Kanban board (Want to Read / Reading / Finished), page progress, skill XP on completion
- **Learning Journal** — Timeline view grouped by date, tags, skill links
- **Lessons Learned** — Searchable knowledge base with tags and skill links
- **Notes Wiki** — Personal knowledge base with create/edit/view, markdown content, tags, search

## Setup

### Prerequisites
- Node.js 18+
- A Neon project with Neon Auth enabled (Email/Password). See `MIGRATION.md` for where to find the values.

### Environment Variables

**server/.env:**
```env
DATABASE_URL="postgresql://[user]:[password]@[host].neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://[user]:[password]@[host].neon.tech/neondb?sslmode=require"
NEON_AUTH_JWKS_URL="https://...neon.tech/.well-known/jwks.json"
PORT=3000
```

**client/.env:**
```env
VITE_NEON_AUTH_URL=https://...   # Neon Console → Auth tab
VITE_API_URL=http://localhost:3000
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
- **Auth Middleware** — Verifies Neon Auth EdDSA JWTs against the JWKS endpoint (`jose`), with an in-memory token cache. `ensureUser` middleware auto-creates the User row on first request
- **Database** — Neon Postgres accessed via Prisma (`DATABASE_URL` for queries, `DIRECT_URL` for migrations)
- **Mobile / PWA** — Installable PWA with a service worker (app-shell caching, network-first navigations), and a layout audited to avoid horizontal overflow on phone-width screens

## AI Integration

The app includes AI prompt templates for importing data from external tools:

- **Hevy Gym Import** — Screenshot your Hevy workout → paste into ChatGPT/Claude with the provided prompt → paste JSON back into the app
- **Food Log Import** — Describe your meal or send a photo → AI estimates calories and macros → paste JSON
- **Recipe Import** — Describe a recipe or send a photo → AI generates structured recipe JSON with ingredients and steps
