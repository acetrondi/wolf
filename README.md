# Wolf

> A brand-voice-aware content operating system that turns one strategic input into a scheduled week of platform-native content, with version history and calendar sync.

**Status:** early foundation (Phase 0). Auth, Neon Postgres, and Drizzle are wired; the product surface is still being built.

Repo: [github.com/acetrondi/wolf](https://github.com/acetrondi/wolf)

---

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router) |
| Auth | [Clerk](https://clerk.com) (email + Google SSO) |
| Database | [Neon](https://neon.tech) Postgres |
| ORM | [Drizzle](https://orm.drizzle.team) (`drizzle-orm` + Neon HTTP) |
| AI gateway | [OpenRouter](https://openrouter.ai) (default model: `google/gemini-3.6-flash`, [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)) |
| Lint / format | [Biome](https://biomejs.dev) |
| Tests | Vitest |
| Packages | npm workspaces (`packages/*`) |

**Not in v1:** auto-publish everywhere. Draft → human approval → export/copy is the default. Google Calendar sync is planned later.

---

## Prerequisites

You need accounts for:

1. **GitHub** — fork or clone this repo  
2. **[Neon](https://console.neon.tech)** — create a project, copy the **pooled** connection string  
3. **[Clerk](https://dashboard.clerk.com)** — create an application, enable Google SSO if you want social login  
4. **[OpenRouter](https://openrouter.ai)** — create an API key  

Optional later: Resend, Vercel, Google Cloud (Calendar API), S3-compatible storage.

**Local tools**

- Node.js **22+** (CI uses 22; Node 24 works too)
- npm **10+**

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/acetrondi/wolf.git
cd wolf
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill **required** values in `.env`:

| Variable | Where to get it |
|---|---|
| `APP_URL` | `http://localhost:3000` for local dev |
| `DATABASE_URL` | Neon → Connection details → **pooled** URL (`…-pooler…`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API keys |
| `CLERK_SECRET_KEY` | Clerk → API keys |
| `OPENROUTER_API_KEY` | OpenRouter → Keys |

Optional keys (email, S3, Calendar, encryption, webhook secret) can stay empty until those features land. The app validates env at boot via `@wolf/config` and fails fast if a required var is missing or invalid.

Never commit `.env`. Only `.env.example` is tracked.

### 3. Database

Push the current Drizzle schema to Neon:

```bash
npm run db:push
```

Smoke-test CRUD (optional):

```bash
npm run db:seed
```

### 4. Clerk

1. In the Clerk Dashboard, set allowed origins / redirect URLs for `http://localhost:3000`.
2. Enable **Google** under SSO connections (development instances can use Clerk’s shared Google credentials).
3. Sign-in / sign-up routes live at `/sign-in` and `/sign-up`.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm run lint` | Biome check |
| `npm run lint:fix` | Biome autofix |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run boundaries` | dependency-cruiser (package/vendor rules) |
| `npm run db:push` | Push schema to Neon (dev) |
| `npm run db:generate` | Generate SQL migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | CRUD smoke script |

CI runs lint → typecheck → boundaries → tests → build on PRs and pushes to `main` / `dev`.

---

## Project structure

```
wolf/
├── app/                      # Next.js App Router (UI + routes)
├── packages/
│   ├── config/               # Zod env contract (@wolf/config)
│   ├── db/                   # Drizzle schema + client (@wolf/db)
│   ├── contracts/            # Shared Zod DTOs (growing)
│   └── core/                 # Use cases + port interfaces (no vendor SDKs)
├── components/               # UI components (shadcn)
├── instrumentation.ts        # Env fail-fast on server boot
├── drizzle.config.ts
├── .env.example
└── .github/workflows/ci.yml
```

**Boundary rules (enforced in CI):**

- `packages/core` must not import Clerk / Supabase / Resend / etc.
- Vendor SDKs for infrastructure belong under `packages/adapters/*` when added (Clerk UI may live in the Next app shell).
- No `@supabase/supabase-js` in this codebase.

---

## Architecture notes (for contributors)

- **Tenancy:** org-scoped from day one. Solo users get an auto-created org of one. Many brands per org.
- **Database:** one `DATABASE_URL` — Neon for development. App code talks to Postgres through Drizzle only.
- **AI:** call OpenRouter behind a port; use JSON Schema structured outputs, not free-form text for content docs.
- **Content ownership:** customer-owned and fully exportable.
- **Human in the loop:** required approval before content is “ready.”

---

## Contributing

1. Fork and create a branch (`feat/…`, `fix/…`).
2. Keep changes focused; run locally before opening a PR:

```bash
npm run lint
npm run typecheck
npm test
npm run boundaries
npm run build
```

3. Open a PR against `dev` (or `main` if that’s the active integration branch). Squash merge preferred.

Conventional commits are appreciated (`feat:`, `fix:`, `docs:`, `chore:`).

---

## License

TBD — license file will be added before a public release. Until then, assume all rights reserved by the maintainers; ask before redistributing.
