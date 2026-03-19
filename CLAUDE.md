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

API requires `apps/api/.env` with non-sensitive config (`PORT`, `CLIENT_URL`, `ROOM_CALL_DURATION_MINUTE`, `N8N_PORT`, `N8N_URL`, `DATABASE_PORT/NAME/USERNAME`) and either:
- **Secrets in `.env`** (default, no Infisical): `DATABASE_URL`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `N8N_API_KEY`, `ROOT_EMAIL`
- **Secrets in Infisical**: set `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID`, `INFISICAL_SITE_URL`, `INFISICAL_ENVIRONMENT` in `.env`. Secrets are fetched at boot via `env.init()`.

Docker Compose provides PostgreSQL, n8n, Redis, and Infisical (secret management).

### Secret Management (Infisical)

Self-hosted Infisical instance for centralized secret management. Secrets are organized by path in Infisical projects.

- **Port**: `SecretManagerPort` → `InfisicalSecretAdapter`
- **Per-company secrets**: stored under `/companies/<name>/` path (e.g., `N8N_API_KEY`)
- **Boot flow**: `env.init()` fetches secrets from Infisical, merges with `process.env`, validates with Zod
- **Fallback**: if `INFISICAL_*` vars are not set, app uses `process.env` directly (backward compatible)

### n8n Workflow Management

Multi-company n8n workflow management CLI in `apps/api/scripts/n8n/`. Single n8n instance, multi-user (one account per company).

**Flow**: Dev in n8n UI → `pull` (sanitize, strip credentials) → version in git → `push` to company account → client assigns credentials in UI.

```bash
cd apps/api
bun n8n pull <id>                             # Pull workflow from root n8n, sanitize, save
bun n8n push <company> <file>                 # Push generic workflow to company's n8n
bun n8n add --name <n> --host <h> --key <k>   # Register a new company account
bun n8n accounts                              # List registered accounts
bun n8n list <company>                        # List workflows on company's n8n
```

Structure:
- `apps/api/n8n/workflows/` — Generic workflow JSONs (git-versioned, credentials stripped)
- `apps/api/n8n/accounts.json` — Company registry (names + hosts, no secrets)
- `~/.config/n8nac/credentials.json` — API keys per company (NOT in git)
- `apps/api/scripts/n8n/` — CLI modules (client, accounts, sanitize, commands)



## Instructions

- Always update CLAUDE.md when important information is explicited
- Always update CLAUDE.md when structural modification is made
- Always update CLAUDE.md when an important discovery is made to improve agentic development (faster coding process, better conversation size optimization)
- Every time a constant string is used in the project, create an enum to make string typesafe, type === "value" -> type === Enum.VALUE

---

## Rules — Adding Features

### Architecture

- Every new capability starts with a **port** (abstract class in the domain layer). Implementation comes after.
- Domain layer must never import from infrastructure or interface layers. Dependencies point inward only.
- All external services (APIs, databases, message brokers, file systems) must be accessed through a port. Never import a concrete implementation in the application layer.
- All dependencies are injected via Inversify. Never import a singleton directly — bind it in a DI module and inject via constructor.
- When a service needs to call back into another service that depends on it (circular dependency), use a **callback pattern** (pass a function via `initSession`, event, etc.) instead of injecting the other service.
- Keep infrastructure adapters thin. Business logic belongs in the application layer (use-cases, services, handlers). Adapters only translate between external protocols and domain contracts.

### Prompts

- All AI prompts live as `.md` files in the `prompts/` directory.
- Prompts are loaded lazily via `Bun.file()`, compiled with Handlebars, and cached.
- Access prompts through the `PromptPort` — never read prompt files directly in services.
- Use `{{variable}}` for HTML-escaped values, `{{{variable}}}` for raw injection (JSON, code, etc.).

### Database

- Prisma client is injectable via `PRISMA_TOKEN`. Repositories receive it through their constructor, never import the global singleton.
- Every schema change requires a migration. Run `prisma generate` after modifying the schema.
- Mappers handle all Prisma ↔ Domain conversion. Never leak Prisma types outside of infrastructure.

### Events

- `EventBusPort.publish()` is async. Always `await` it when the caller needs to guarantee handlers have executed before responding.
- Event handlers register themselves in their constructor via `eventBus.subscribe()`. They are eagerly resolved in the DI container.
- When an event needs additional context (e.g., a company URL), enrich the event payload rather than having the handler do extra lookups.

### Testing

- **Real dependencies over mocks.** Use the real OpenAI API, real PostgreSQL, real services. Only mock what you cannot control (external MCP servers, third-party webhooks).
- **Transaction isolation.** Every test that touches the database runs inside a Prisma `$transaction` that is rolled back after the test. Zero data pollution between tests.
- Use `createTestContext()` for DB tests: `beforeEach(ctx.setup)` / `afterEach(ctx.teardown)`. The container is fresh per test, bound to the transactional client.
- HTTP endpoint tests use the production Hono `app` and the production DI container. Create test data before tests and clean up in `afterAll`.
- **Auth in HTTP tests**: all `/api/v1/*` routes require a session. Use `createTestSession()` from `tests/helpers/auth-session.ts` to create a real user+session in the DB with a properly signed cookie. Pass it as `{ Cookie: cookie }` in every `app.request()` call. Clean up with `cleanupTestSession(userId)` in `afterAll`.
- **Spy leak rule**: always call `mock.restore()` in `afterEach`, **never** `beforeEach`, when using `spyOn` on module-level singletons (e.g. `auth.api.getSession`). Bun test files share module instances across workers — an unrestored spy from the last test leaks to other test files and silently breaks auth in integration tests.
- Tests that call external APIs (OpenAI) must set `setDefaultTimeout(30_000)` or higher. They are slower and cost money — keep them focused.
- For every new service or feature, write tests at **three levels**:
  1. **Unit** — test the logic in isolation with lightweight fakes for ports.
  2. **Integration DB** — test with real database in a transaction.
  3. **Integration API** — test with real external APIs when applicable.
- Test edge cases: missing data, null values, unreachable services, invalid inputs, early returns.
- The test preload (`tests/preload.ts`) resolves `.env` relative to the file, not CWD. Tests work from any directory.
- Tests live in `apps/api/tests/` (unit and integration subdirectories).

### Adding a Feature — Checklist

1. **Port first** — define the abstract contract in `domain/ports/` or `domain/repositories/`.
2. **Model** — add or update domain models if the feature introduces new data.
3. **Schema** — update Prisma schema, generate client, run migration.
4. **Application service** — implement the business logic, inject only ports.
5. **Infrastructure adapter** — implement the port for the concrete technology.
6. **DI binding** — register the new port → adapter mapping in the appropriate DI module.
7. **Interface** — add HTTP routes, DTOs, or event handlers if the feature is user-facing.
8. **Prompts** — if the feature involves AI, create a `.md` prompt and use `PromptPort.render()`.
9. **Tests** — write unit + integration tests before considering the feature done.
10. **Verify** — `bun run check-types` + `bun test` from `apps/api/` must both pass.
