<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wolf — agent instructions

## Session start (mandatory)

**Before any exploration, planning, or implementation in a new chat**, read:

1. `docs/steps-taken-so-far.md` — current progress, decisions, and what’s next  
2. Then only the plan/ADR files needed for the task (e.g. `docs/plans/phase-*.md`, `docs/decisions/*`)

Do **not** re-litigate settled choices in those files (Neon-only, no Docker Postgres, OpenRouter model, org tenancy, etc.) unless the user explicitly changes them.

`docs/` is gitignored (local planning). Public setup lives in `README.md` — keep it accurate when setup steps change.

---

## Server-first UI (default)

Prefer **server** work. Use the client only when the browser must participate.

| Prefer | Use when |
|---|---|
| Server Components | Rendering, data fetch, layout, static/dynamic pages |
| Server Actions | Mutations, form submits, trusted server workflows |
| Route Handlers (`app/api/...`) | Webhooks, external callbacks, non-form HTTP APIs |
| Client Components (`"use client"`) | Only for interactivity: controlled inputs, local UI state, browser APIs, animations that need the DOM |

Rules:

- Default new files to **Server Components**. Add `"use client"` at the leaf that needs it — never wrap a whole page client “just in case”.
- Don’t fetch secrets or talk to Postgres from the client. DB access goes through `@wolf/db` (`withTenant` / `withSystem`) on the server.
- Clerk: use server `auth()` / `currentUser()` in RSC and actions; client hooks only in interactive UI (e.g. `UserButton`).
- Keep Server Actions and route handlers thin: validate with Zod → call a use-case / db helper → return typed results.

---

## Naming conventions

- **Files / folders:** `kebab-case` (`brand-voice.ts`, `content-plan/`).  
- **React components:** `PascalCase` file matching export (`BrandSwitcher.tsx`).  
- **Functions / variables:** `camelCase`.  
- **Types / interfaces:** `PascalCase` (`TenantCtx`, `ContentDoc`).  
- **DB / SQL:** `snake_case` tables and columns (`content_variant`, `org_id`).  
- **Env vars:** `SCREAMING_SNAKE_CASE` as in `.env.example` / `@wolf/config`.  
- **Packages:** `@wolf/<name>` (`@wolf/config`, `@wolf/db`).  
- **Tests:** colocate as `*.test.ts` or `__tests__/*.test.ts` next to the module.  
- **Server Actions:** name for the verb (`createBrand`, `approveVariant`) — not `handleSubmit`.  
- **Booleans:** `is` / `has` / `can` prefixes (`isPersonal`, `hasAccess`).

---

## DRY and boundaries

- One source of truth: shared Zod schemas in `@wolf/contracts` (or domain package), not copy-pasted across actions and clients.
- Env only via `@wolf/config` (`loadEnv` / `env`) — no scattered `process.env.X!`.
- DB only via `@wolf/db` public API (`withTenant`, `withSystem`, `schema`). Never export or import raw pools from app code.
- Vendor SDKs (OpenRouter, Resend, Google, S3, …) live under `packages/adapters/*` when added — not in `packages/core` or random `app/` files. Clerk UI may stay in the Next app shell.
- Don’t abstract prematurely; do extract when the same logic would appear a third time or crosses a package boundary.

---

## Clean folder structure

Keep the lightweight monorepo shape (Next app at repo root):

```
app/                    # routes, layouts, Server Actions colocated when route-specific
  api/                  # route handlers (webhooks, external HTTP)
components/             # UI — prefer server-friendly; client leaves under components/ui or feature folders
lib/                    # app-local pure helpers (not domain core)
packages/
  config/               # env + constants
  contracts/            # shared Zod / DTOs
  core/                 # use cases + port interfaces (no vendor SDKs)
  db/                   # schema, migrations, tenant gate, seed
  adapters/             # vendor implementations (when added)
  ui/                   # design system (when added)
docs/                   # local only (gitignored) — plans, ADRs, steps-taken-so-far
```

- Colocate route-specific actions next to the route (`app/(app)/brands/actions.ts`) when they’re not shared.
- Shared domain logic goes in `packages/core` or `packages/db`, not deep under `app/`.
- Avoid deep `utils/` junk drawers — name by domain (`lib/dates.ts`, not `lib/helpers.ts`).
- No new top-level folders without a clear ownership story.

---

## Quality bar (every change)

- Types: no `any` on public surfaces; match existing strict TS settings.
- Zod at external boundaries (HTTP body, webhook, AI output, env).
- If it touches a tenant table: go through `withTenant` (or audited `withSystem` with a reason).
- Update `docs/steps-taken-so-far.md` when a phase milestone or durable decision lands.
- Update `README.md` when contributor setup steps change.
