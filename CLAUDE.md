# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun dev                    # Start all apps in parallel (Turbo)
bun run up                 # Start Docker services (PostgreSQL, n8n)
bun run down               # Stop Docker services

# Type checking & linting
bun run check-types        # Type-check all packages
bun run check              # Biome lint+format (auto-fix with --unsafe)

# Build
bun run build              # Build all packages

# API-specific
cd apps/api
bun dev                    # Start API with watch mode
bun run studio             # Open Prisma Studio
bun run db:re-migrate      # Wipe and re-run all migrations

# Frontend-specific
cd apps/frontend
bun dev                    # Start React Router dev server
bun run shadcn             # Add Shadcn components
```

**Package manager**: Bun only. Never use npm or yarn.
**Monorepo**: Turborepo. Run workspace-specific commands from their directory or use `turbo run <task> --filter=<app>`.

## Architecture

This is an **AI-powered real-time voice calling platform** using OpenAI's Realtime API.

### Monorepo Layout

- `apps/api/` — Backend (Bun + Hono, clean/layered architecture)
- `apps/frontend/` — Frontend (React 19 + React Router v7)
- `packages/shared/` — Shared types including OpenAI OpenAPI-generated types

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Backend framework | Hono 4 + `@hono/zod-openapi` |
| Database | PostgreSQL 18 + Prisma ORM |
| Auth | Better-auth 1.5 (Google OAuth) |
| DI | Inversify 8 |
| Events | RxJS event bus |
| Frontend | React 19 + React Router 7 |
| Data fetching | TanStack React Query 5 |
| UI | Radix UI + Shadcn + Tailwind CSS 4 |
| Linter/Formatter | Biome |
| Git hooks | Lefthook (pre-commit: build + typecheck + biome) |

## Environment

API requires `apps/api/.env` with: `PORT`, `CLIENT_URL`, `DATABASE_URL`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ROOM_CALL_DURATION_MINUTE`, `N8N_PORT`, `DATABASE_PORT/NAME/USERNAME/PASSWORD`.

Docker Compose provides PostgreSQL and n8n (workflow automation).



## Instructions

- Always update CLAUDE.md when important information is explicited
- Always update CLAUDE.md when structural modification is made
- Always update CLAUDE.md when an important discovery is made to improve agentic development (faster coding process, better conversation size optimization)
