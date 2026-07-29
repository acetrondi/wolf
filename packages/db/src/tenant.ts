import postgres from "postgres";

import type { TenantCtx, Tx } from "./types";

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function requireAppUrl(): string {
  const url =
    nonEmpty(process.env.DATABASE_URL_SESSION) ??
    nonEmpty(process.env.DATABASE_URL_MIGRATOR) ??
    nonEmpty(process.env.DATABASE_URL);
  if (!url) throw new Error("DATABASE_URL is required");
  return url;
}

function requireMigratorUrl(): string {
  const url =
    nonEmpty(process.env.DATABASE_URL_MIGRATOR) ?? nonEmpty(process.env.DATABASE_URL);
  if (!url) throw new Error("DATABASE_URL_MIGRATOR or DATABASE_URL is required");
  return url;
}

const pools = new Map<string, ReturnType<typeof postgres>>();

function getSql(url: string) {
  const existing = pools.get(url);
  if (existing) return existing;
  const sql = postgres(url, { max: 3, prepare: false, idle_timeout: 20 });
  pools.set(url, sql);
  return sql;
}

/**
 * Tenant-scoped work. Transaction-local GUCs + SET LOCAL ROLE app_user
 * so FORCE RLS applies even when the login role is the Neon owner.
 */
export async function withTenant<T>(
  ctx: TenantCtx,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const sql = getSql(requireAppUrl());
  return sql.begin(async (tx) => {
    await tx`select set_config('app.current_org_id', ${ctx.orgId}, true)`;
    await tx`select set_config('app.current_user_id', ${ctx.userId}, true)`;
    await tx`set local role app_user`;
    return fn(tx);
  }) as Promise<T>;
}

/**
 * Cross-tenant / bootstrap work as app_owner (BYPASSRLS).
 * Requires a non-empty reason — audited on every call.
 */
export async function withSystem<T>(
  reason: string,
  fn: (tx: Tx) => Promise<T>,
  meta: Record<string, unknown> = {},
): Promise<T> {
  if (!reason.trim()) {
    throw new Error("withSystem requires a non-empty reason string");
  }
  const sql = getSql(requireMigratorUrl());
  return sql.begin(async (tx) => {
    await tx`set local role app_owner`;
    await tx`
      insert into audit_log (actor_type, action, meta)
      values ('system', 'with_system', ${sql.json({ reason, ...meta })})
    `;
    return fn(tx);
  }) as Promise<T>;
}

export async function closeDbClients() {
  const pending = [...pools.values()].map((p) => p.end({ timeout: 5 }));
  pools.clear();
  await Promise.all(pending);
}
