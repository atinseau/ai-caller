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

This is an **AI-powered real-time voice & text calling platform** using OpenAI's Realtime API (AUDIO) and Chat Completions API (TEXT).

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

### Modality Architecture

The platform supports two modalities with different APIs:

| Modality | API | Model | Use case |
|----------|-----|-------|----------|
| AUDIO | Provider-agnostic via `AudioProviderPort` | Configurable via `AUDIO_PROVIDER` env (default: Grok) | Voice calls, telephony |
| TEXT | OpenAI Chat Completions (HTTP streaming) | Configurable via `TEXT_MODEL` env (default `gpt-4.1`) | Web chat, WhatsApp |

- **`AudioProviderPort`**: Abstract port for audio AI providers. Each provider implements `connect(config) → AudioProviderConnection`. Events are normalized to `NormalizedAudioEvent` (transcript.delta/done, audio.delta/done, function_call, speech_started/stopped).
- **`AudioProviderEnum`**: `GROK` (default), `OPENAI`. Set via `AUDIO_PROVIDER` env var.
- **`GrokAudioProviderAdapter`**: Connects to `wss://api.x.ai/v1/realtime`. Uses `XAI_API_KEY`.
- **`OpenAIAudioProviderAdapter`**: Connects to `wss://api.openai.com/v1/realtime`. Uses `OPENAI_API_KEY`.
- **`RealtimeAudioGateway`**: Unified gateway that uses `AudioProviderPort`. Replaces the old `OpenAIRealtimeGateway`.
- **`ChatServicePort` / `OpenAIChatService`**: Manages TEXT conversations via Chat Completions with streaming, message history, and tool calls.
- **`ToolExecutionService`**: Shared service for tool execution logic (create ToolInvoke, dispatch SubAgent, publish events). Used by both `RealtimeSessionService` (AUDIO) and `OpenAIChatService` (TEXT). Transport-agnostic via callback pattern (`onResult`/`onError`).
- **`ChatModelEnum`**: Enum for chat models (`gpt-4.1`, `gpt-4o-mini`). Used in env validation for `TEXT_MODEL` and `SUB_AGENT_MODEL`.
- **Adding a new audio provider**: Create a single adapter class implementing `AudioProviderPort`, register it in `gateway.module.ts`. No other changes needed.

### Audio Transport (WebSocket-based)

All audio channels (WebRTC browser, telephony) now route through the backend:
- **Browser → Backend**: WebSocket at `/api/v1/room/{roomId}/audio` carries base64 PCM16 audio chunks
- **Backend → Provider**: `AudioProviderPort.connect()` opens provider-specific WebSocket
- **Frontend**: `AudioCaptureService` (mic → PCM16 base64) + `AudioPlaybackService` (PCM16 → speaker via AudioContext)
- **No WebRTC**: The old WebRTC direct-to-OpenAI flow has been replaced. All audio transits the backend.

### OpenAI Realtime API (legacy, available via AUDIO_PROVIDER=openai)

The platform uses OpenAI's Realtime API for voice conversations. Key integration points:

- **Session creation**: `OpenAICallService.createCall()` creates an ephemeral token via `/realtime/clientSecrets` (SDK method `openai.realtime.clientSecrets()`)
- **Backend WebSocket**: `OpenAIRealtimeGateway` opens a server-side WS to OpenAI for each room (proxies events, handles tool calls)
- **Frontend WebRTC**: The browser connects directly to OpenAI via WebRTC for low-latency audio (~200-400ms)
- **Dual channel**: Audio flows client↔OpenAI (WebRTC), events flow backend↔OpenAI (WebSocket). The backend monitors the WS for tool invocations and transcripts.
- **Voice config**: Set in `clientSecrets` session config. Use latest voices (`marin`, `cedar`) for most natural output. 10 voices available: alloy, ash, ballad, coral, echo, marin, cedar, sage, shimmer, verse.
- **Turn detection**: Configure `semantic_vad` (preferred) or `server_vad` in the session. `semantic_vad` with `eagerness: "medium"` is the default. Eagerness levels: `low` (patient, good for complex questions), `medium` (balanced), `high` (snappy, good for transactional flows).
- **Audio format**: WebRTC path uses `opus` output for lowest latency. Telephony path will use `audio/pcmu` (G.711 mu-law) — OpenAI supports it natively, no transcoding needed.
- **Language**: Set `input_audio_transcription.language` to the company's ISO 639-1 code to improve transcription accuracy and reduce latency. Also reinforce language in the system prompt to prevent accidental switching.
- **Telephony (future)**: OpenAI has a native SIP endpoint (`sip.api.openai.com`). Alternative: Twilio Media Streams WebSocket bridge. Both avoid audio format conversion since OpenAI supports `audio/pcmu`.

### Structured System Prompt (7 Sections)

The company's system prompt is stored as `systemPromptSections` (JSON) with 7 editable sections, following OpenAI's recommended voice agent prompt skeleton. The `Tools` section is excluded because it's auto-generated by `OpenAICallService.buildTools()`.

| Section key | Purpose |
|---|---|
| `roleObjective` | Who is the agent, primary mission |
| `personalityTone` | Voice style, energy, formality |
| `context` | Company info, products, services |
| `referencePronunciations` | Phonetic guides for brand names |
| `instructionsRules` | Business rules, do's and don'ts |
| `conversationFlow` | Conversation states and transitions |
| `safetyEscalation` | Boundaries, fallback, escalation |

At call time, `OpenAICallService` passes all 7 sections + `language` to `instructions-prompt.md` (Handlebars template), which merges them with hardcoded voice guidelines (anti-repetition, pacing, backchanneling, tool usage) into a single prompt injected as `session.instructions`.

- **Activation requires** at least one section to be non-empty.
- **Active companies** cannot have all sections cleared.
- **Frontend**: Section navigation table + WYSIWYG editor per section. All sections saved as a single JSON payload.

### Sub-Agent Pattern (MCP Tool Execution)

When the AI agent needs to execute an action (e.g., create a ticket, check inventory):

1. OpenAI sends a `function_call` event via the WebSocket
2. `RealtimeSessionService` creates a `ToolInvoke` record (RUNNING) and immediately returns a `"processing"` acknowledgment to OpenAI so the conversation continues
3. `SubAgentService` runs asynchronously: connects to the company's MCP server, executes the tool, then sends the raw result to an LLM for summarization
4. The summarized result is injected back into the conversation as a user message
5. All tool events are streamed to the frontend via SSE for real-time debug visibility

This pattern keeps the conversation flowing while tools execute in the background. The AI can check tool status via the `get_tool_status` system tool.

### Contact Profiles

End-users are tracked across sessions via the `Contact` model, scoped per company.

- **Identifiers** (all optional): `phoneNumber` (telephony/WhatsApp), `email`, `ipAddress` (WebRTC), `userAgent` (enrichment only, not used for matching)
- **Matching**: OR on `phoneNumber`, `email`, `ipAddress` within the same `companyId`
- **Summary**: Compacted LLM summary of all past interactions, stored on `Contact.summary`
- **Session start** (prod only): `ContactService.findOrCreate()` resolves a contact by identifiers. If the contact has a `summary`, it's injected into the prompt via `{{contactSummary}}` in `instructions-prompt.md`
- **Session end**: `ContactService.compactSession()` is called in `terminateCall()` BEFORE room deletion. Collects all transcript events, sends to LLM (`session-summary-prompt.md`), merges with existing summary
- **Room link**: `Room.contactId` FK to Contact (SetNull on delete)
- **Test sessions**: Skip contact resolution and compaction entirely

### WhatsApp Integration

WhatsApp Business channel using Meta Cloud API directly (no Twilio).

- **Config model**: `WhatsAppConfig` (Prisma) — one per company. Stores `phoneNumberId`, `whatsappBusinessId`, `accessToken`, `verifyToken`.
- **Port**: `WhatsAppClientPort` → `MetaWhatsAppClientAdapter` — sends messages via Meta Graph API v21.0.
- **Use case**: `WhatsAppUseCase` — handles incoming messages, outbound conversations, config CRUD.
- **Webhook**: `POST /api/whatsapp/webhook` (public) — receives Meta webhook events, validates signature.
- **Verification**: `GET /api/whatsapp/webhook` — Meta webhook verification (challenge/response).
- **Config API**: `GET/POST/PATCH/DELETE /api/v1/company/{companyId}/whatsapp` (auth required).
- **Start conversation**: `POST /api/v1/company/{companyId}/whatsapp/start` — trigger outbound WhatsApp conversation.
- **Session management**: In-memory `Map<whatsappPhone, roomId>` for routing. Rooms created with `source: WHATSAPP`, `modality: TEXT`. Uses `ChatServicePort` for AI responses.
- **Room sources**: `WEBRTC` (browser), `TELEPHONY` (phone), `WHATSAPP` (Meta).
- **24h window**: WhatsApp Business API limits: can only reply within 24h of user's last message. Outside this window, must use pre-approved message templates.

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
bun n8n push [company] <file>                 # Push workflow to n8n (default: root)
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
- When modifying OpenAI Realtime session config, always verify the change against the OpenAI Realtime API docs — session parameters are validated server-side and silent failures are common
- Prompts for voice agents must be optimized for spoken output: short sentences, contractions, no URLs/emails spelled out, conversational fillers where natural

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

- All AI prompts live as `.md` files in the `src/prompts/` directory.
- Prompts are loaded lazily via `Bun.file()`, compiled with Handlebars, and cached.
- Access prompts through the `PromptPort` — never read prompt files directly in services.
- Use `{{variable}}` for HTML-escaped values, `{{{variable}}}` for raw injection (JSON, code, etc.).
- **Voice prompts** must be written for spoken delivery: short sentences, bullet points over paragraphs, no markdown formatting that won't be spoken. The system prompt directly influences how natural the agent sounds.
- **Voice prompt structure**: 7 user-editable sections (roleObjective, personalityTone, context, referencePronunciations, instructionsRules, conversationFlow, safetyEscalation) + a hardcoded Tool Usage section. All stored in `company.systemPromptSections` (JSON) and merged at call time via `instructions-prompt.md`.
- **Anti-repetition**: Add variety constraints to prevent the agent from opening consecutive turns with the same phrase. Avoid repetitive fillers like "Sure!", "Of course!".
- **Pacing instruction**: Include "Deliver your audio response fast, but do not sound rushed." in voice prompts.
- **Spelling out**: For phone numbers, emails, order IDs — instruct the agent to spell character by character for confirmation.

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
10. **Verify** — `bun run check-types` + `bun check` + `bun test` from `apps/api/` must all pass.

### Biome Lint Rules (enforced as errors)

The `suspicious` rule group is set to `"error"` globally. Respect these rules when writing new code:

- **`noEmptyBlockStatements`** — never write `() => {}`. Always add a comment: `() => { /* noop */ }` or `() => { /* intentionally ignored */ }`.
- **`useAwait`** — never mark a function `async` unless it contains an `await`. Return `Promise.resolve(value)` directly if needed.
- **`noNonNullAssertion`** — never use `!` to assert non-null. Use a null guard (`if (!x) return`), a fallback (`?? default`), or a definite assignment assertion (`let x!: T`) for DI-injected fields.
- **`noExplicitAny`** — never use `any`. Use the proper domain type, a generic, or `unknown` with a type guard.
- **`noConsole`** — `console.*` is forbidden everywhere except `**/scripts/**` (excluded via biome override).
- **`noAlert`** — `alert/confirm/prompt` must be suppressed with a `biome-ignore` comment explaining why the native dialog is intentional.
- **`noDocumentCookie`** — direct `document.cookie` writes must be suppressed with a `biome-ignore` comment (frontend override sets this to `"warn"`, but prefer the Cookie Store API for new code).
- **`noReactSpecificProps`** — disabled for `apps/frontend/**`. Use `className` (not `class`) in all JSX/TSX.

**When a biome-ignore comment is needed**, always include the reason:
```ts
// biome-ignore lint/suspicious/useAwait: required async signature by better-auth hook interface
```

**Scope of overrides** (defined in `biome.json`):
- `apps/frontend/**` — `noReactSpecificProps: off`, `noDocumentCookie: warn`
- `**/scripts/**` — `noConsole: off`
- `**/openapi-openai.types.ts` — excluded from checks (file exceeds 1 MiB size limit)

### Frontend — Audio & WebRTC

- Audio constraints are configured in `infrastructure/browser/audio-stream.ts`. Always enable `echoCancellation`, `noiseSuppression`, `autoGainControl`, mono channel, 48kHz sample rate.
- The WebRTC connection to OpenAI is established client-side (`realtime-openai-room.service.ts`). The SDP offer/answer flow goes through OpenAI's `/v1/realtime/calls` endpoint.
- Call state is managed via `useReducer` in `useRealtimeCall.ts` (states: idle → initializing → connecting → connected).
- SSE streaming from backend (`useSessionStream.ts`) provides real-time transcripts and tool events for the debug UI.
- There is currently **no i18n/l10n** — all UI text is hardcoded in English. Dates use `toLocaleTimeString()` for locale-aware formatting.
- **iOS caveat**: Echo cancellation may not work for the first ~10 seconds on iOS Safari. Consider a brief "connecting" state with muted output as workaround.

### Telephony (Future)

When adding telephony support, follow these patterns:
- **Port**: `TelephonyProviderPort` — abstract contract for provisioning numbers, configuring webhooks, releasing numbers.
- **Model**: `PhoneNumber` — E.164 format, linked to a company, with provider SID.
- **Gateway**: `TelephonyGateway` — bridges Twilio Media Streams WebSocket to OpenAI Realtime WebSocket. Uses `audio/pcmu` format (no transcoding).
- **Session config for telephony**: Use API key directly (not ephemeral token) since there's no client-side exposure. Audio format is `audio/pcmu` instead of `opus`.
- **Call routing**: Twilio webhook receives `To` number → look up company → load config → return TwiML with `<Connect><Stream>` → open OpenAI session with company's prompt/tools.
- Reuse `RealtimeSessionService` for all event processing — the telephony path only changes the transport layer.
