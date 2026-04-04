# Project Arise

A personal growth web application that centralizes self-improvement tracking across multiple life domains. Track your fitness, diet, learning, and habits — all in one place with a gamified experience that keeps you motivated.

## Features

- **Gamification** — Level system with XP, quests, daily/weekly tasks, and individual skill tracking (guitar, coding, etc.) each with their own progression
- **Body** — Weight graph over time, body measurements, gym session logging with a muscle soreness heat map, and weekly training programs
- **Diet** — Daily calorie tracking with meal breakdowns, recipe management, weekly meal prep planning with auto-generated grocery lists
- **Learning** — Upload and organize PDFs and Markdown documents by category, search and browse your study materials
- **Weekly Summary** — Auto-generates a Markdown report of everything you did across all tabs, ready to paste into an AI for a weekly review session

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT + bcrypt |
| Testing | Vitest, fast-check, React Testing Library, Supertest |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Run database migrations
npx prisma migrate dev

# Seed the database (creates default user)
npx prisma db seed

# Start the development servers
npm run dev
```

The frontend runs on `http://localhost:5173` and the API on `http://localhost:3000`.

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components organized by tab
│   │   ├── contexts/       # Auth context, app state
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # API client, utilities
│   │   └── styles/         # Tailwind config, theme tokens
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── controllers/    # Route handlers per domain
│   │   ├── services/       # Business logic (XP, soreness calc)
│   │   ├── middleware/      # Auth middleware, error handling
│   │   └── prisma/         # Schema, migrations, seed
│   └── ...
└── .kiro/specs/            # Spec documents (requirements, design, tasks)
```

## Dark Theme

The portal uses a dark-first design with vibrant accent colors:

- Neon teal for XP bars and active elements
- Vibrant purple for levels and skills
- Coral red for high soreness on the heat map
- Green for completed tasks
- Blue for charts and links

## License

Private project — personal use only.
