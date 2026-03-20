# AI Caller

**Plateforme d'agents vocaux IA en temps reel pour entreprises.**

AI Caller permet a n'importe quelle entreprise de deployer un agent vocal intelligent, connecte a ses outils metier, accessible par telephone ou navigateur web.

## Le probleme

Les entreprises perdent des milliers d'heures par mois en appels repetitifs : support client, prise de rendez-vous, qualification de leads, relances. Les solutions existantes (IVR, chatbots) offrent une experience frustrante et rigide.

Les agents vocaux IA actuels souffrent de trois limitations majeures :
- **Latence perceptible** — le delai entre la fin de la parole et la reponse casse l'illusion de conversation naturelle
- **Incapacite d'agir** — l'agent parle mais ne peut pas executer d'actions concretes (creer un ticket, verifier un statut, envoyer un email)
- **Integration complexe** — connecter un agent vocal aux outils existants d'une entreprise demande des mois de developpement

## La solution

AI Caller resout ces trois problemes :

1. **Conversation naturelle en temps reel** — WebRTC + OpenAI Realtime API pour une latence sub-300ms, avec detection semantique de tour de parole
2. **Execution d'actions via MCP** — L'agent appelle des outils metier en temps reel grace au Model Context Protocol. Chaque entreprise connecte son propre serveur MCP avec ses outils (CRM, calendrier, base de donnees)
3. **Multi-tenant plug & play** — Une entreprise configure son agent (prompt systeme, outils, voix) depuis un dashboard, et l'agent est immediatement operationnel

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│              React 19 + React Router 7                      │
│     WebRTC Audio ←→ OpenAI Realtime API (client-side)       │
│     SSE Stream  ←→ Backend (transcripts, tool events)       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP + SSE
┌──────────────────────────▼──────────────────────────────────┐
│                     Backend API                              │
│                  Bun + Hono 4                                │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Room Mgmt  │  │  Realtime    │  │  Sub-Agent         │  │
│  │  Use-Case   │  │  Session     │  │  (MCP + LLM        │  │
│  │             │  │  Service     │  │   Summarization)   │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Company    │  │  OpenAI WS   │  │  MCP Client        │  │
│  │  Use-Case   │  │  Gateway     │  │  Adapter           │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│                                                              │
│  PostgreSQL 18 (Prisma) │ RxJS Event Bus │ Infisical Secrets │
└──────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   External Services                          │
│                                                              │
│  OpenAI Realtime API    MCP Servers    n8n Workflows         │
│  (Voice + Tools)        (Per-company)  (Automation)          │
└──────────────────────────────────────────────────────────────┘
```

### Flux d'un appel vocal

1. L'utilisateur demarre un appel depuis le dashboard
2. Le frontend acquiert le microphone et etablit une connexion WebRTC avec OpenAI
3. Le backend cree une room, configure la session (prompt, outils, voix) et ouvre un canal WebSocket parallele vers OpenAI
4. L'utilisateur parle — OpenAI transcrit et genere une reponse vocale en temps reel
5. Si l'agent doit executer une action, un sub-agent se connecte au serveur MCP de l'entreprise, execute l'outil, et resume le resultat
6. Les transcripts et evenements sont streames en SSE vers le frontend pour le debug en temps reel

### Flux telephonique (a venir)

1. Un numero de telephone est associe a une entreprise
2. Un appel entrant arrive via Twilio Media Streams
3. Le backend cree automatiquement une room et proxy l'audio entre Twilio (mu-law 8kHz) et OpenAI Realtime API (PCM16 24kHz)
4. Meme pipeline de session, outils MCP, et sub-agents

## Stack technique

| Couche | Technologie |
|--------|------------|
| Runtime | Bun |
| Backend | Hono 4 + @hono/zod-openapi |
| Base de donnees | PostgreSQL 18 + Prisma ORM |
| Auth | Better-auth (Google OAuth) |
| DI | Inversify 8 |
| Events | RxJS |
| Frontend | React 19 + React Router 7 |
| Data fetching | TanStack React Query 5 |
| UI | Radix UI + Shadcn + Tailwind CSS 4 |
| Voice AI | OpenAI Realtime API (gpt-realtime) |
| Tool execution | Model Context Protocol (MCP) |
| Workflows | n8n (multi-tenant) |
| Secrets | Infisical (self-hosted) |
| Monorepo | Turborepo + Bun workspaces |

## Fonctionnalites actuelles

- **Dashboard multi-tenant** — Creation et gestion de compagnies (ROOT) ou acces a sa propre compagnie (USER)
- **Configuration d'agent** — Prompt systeme riche (Tiptap/Markdown), choix de voix, configuration d'outils
- **Decouverte d'outils MCP** — Connexion a un serveur MCP, listing automatique des outils, personnalisation des descriptions et parametres
- **Appels vocaux en temps reel** — WebRTC vers OpenAI, transcription bidirectionnelle, streaming SSE
- **Mode texte** — Alternative text-only pour le debug et les tests
- **Execution d'outils async** — Sub-agent MCP avec resume LLM, suivi de statut en temps reel
- **Session debug** — Visualisation live des transcripts, appels d'outils, parametres et resultats
- **Mode test** — Simulation d'execution d'outils sans appeler le serveur MCP reel
- **Gestion de workflows n8n** — CLI multi-compagnie pour push/pull de workflows

## Demarrage rapide

```bash
# Prerequisites: Bun, Docker

# 1. Cloner et installer
git clone <repo-url>
cd ai-caller
bun install

# 2. Configurer l'environnement
cp apps/api/.env.example apps/api/.env
# Remplir: DATABASE_URL, OPENAI_API_KEY, GOOGLE_CLIENT_ID/SECRET, ROOT_EMAIL

# 3. Demarrer les services Docker (PostgreSQL, n8n, Redis, Infisical)
bun run up

# 4. Appliquer les migrations
cd apps/api && bunx prisma migrate deploy && bunx prisma generate && cd ../..

# 5. Lancer le dev
bun dev
```

Le frontend est accessible sur `http://localhost:5173`, l'API sur `http://localhost:3000`.

## Roadmap

### Phase 1 — Telephonie
- Association numero de telephone ↔ compagnie
- Integration Twilio Media Streams
- Proxy audio mu-law ↔ PCM16
- Appels entrants automatiques

### Phase 2 — Qualite vocale
- Migration vers `semantic_vad` avec eagerness configurable
- Voix naturelles (marin, cedar) configurables par compagnie
- Optimisation latence (format opus, prompts concis)
- Gestion de langue par compagnie (ISO 639-1)

### Phase 3 — Experience naturelle
- Prompt systeme optimise pour la voix (backchanneling, contractions, pacing)
- Instructions vocales dynamiques (ton, rythme, emotion)
- Gestion des interruptions et reprises de contexte
- Monitoring qualite audio (packet loss, jitter, RTT)

### Phase 4 — Production
- CI/CD (GitHub Actions)
- Monitoring et alerting
- Analytics d'appels (duree, satisfaction, resolution)
- Multi-region deployment

## Licence

Proprietary. All rights reserved.
