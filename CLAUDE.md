# Marquei — Project Guide

## Overview

Marquei is an online scheduling platform for beauty salons and aesthetic clinics. It replaces manual spreadsheet/phone processes with an automated booking system.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL 16 with Prisma ORM
- **Queue:** BullMQ + Redis
- **Infra:** Docker Compose

## Project Structure

```
marquei/
├── frontend/          # React + Vite app
├── backend/           # NestJS app
├── docker-compose.yml
├── PLANEJAMENTO.md    # Full project plan (Portuguese)
└── README.md
```

## Architecture Decisions

- **Auth:** JWT (access + refresh tokens), bcrypt, RBAC with NestJS Guards
- **Roles:** MANAGER, PROFESSIONAL, CLIENT
- **Double-booking prevention:** Prisma transactions with pessimistic locking + PostgreSQL exclusion constraint (btree_gist + tsrange)
- **Notifications:** Async via BullMQ workers; idempotent by (appointment_id, type) unique key
- **Imports:** Async CSV/Excel processing via BullMQ; partial failure (row-level errors don't invalidate batch)

## Commands

```bash
# Dev environment
docker compose up -d postgres redis    # Start infra
cd frontend && npm run dev             # Start frontend (localhost:5173)
cd backend && npm run start:dev        # Start backend (localhost:3000)

# Database
cd backend && npx prisma migrate dev   # Run migrations
cd backend && npx prisma generate      # Generate Prisma client
cd backend && npx prisma db seed       # Seed database
cd backend && npx prisma studio        # Open Prisma Studio

# Tests
cd backend && npm test                 # Backend tests
cd frontend && npm test                # Frontend tests

# Lint
cd backend && npm run lint             # Backend lint
cd frontend && npm run lint            # Frontend lint
```

## Conventions

- Language: TypeScript strict mode everywhere
- Backend pattern: Controller → Service → Prisma (thin controllers, business logic in services)
- DTOs validated with class-validator + class-transformer
- API responses follow consistent format: `{ data, meta? }` for success, `{ message, statusCode }` for errors
- Use `@nestjs/config` with typed config objects, never raw `process.env`
- Frontend state: TanStack Query for server state, Zustand for client state (auth, UI)
- All components use shadcn/ui primitives — no custom CSS for base components
- Portuguese (pt-BR) for all user-facing text
- English for code (variable names, comments, commit messages)
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, etc.)

## Key Files

- `PLANEJAMENTO.md` — Full project plan with epics, tasks, and acceptance criteria
- `backend/prisma/schema.prisma` — Database schema (source of truth for entities)
- `backend/src/common/` — Shared guards, decorators, pipes, filters
- `frontend/src/lib/api.ts` — API client configuration
