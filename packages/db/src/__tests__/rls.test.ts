import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { closeDbClients, withSystem, withTenant } from "../tenant";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

const hasDb = Boolean(process.env.DATABASE_URL?.trim());

function requireRow<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`Expected ${label}`);
  return row;
}

describe.skipIf(!hasDb)("schema guards (Neon)", () => {
  afterAll(async () => {
    await closeDbClients();
  });

  it("SG-01: every org_id table has RLS + FORCE RLS", async () => {
    await withSystem("SG-01 schema guard", async (tx) => {
      const rows = await tx<{ relname: string }[]>`
        select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
          and exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = c.relname
              and column_name = 'org_id'
          )
          and (c.relrowsecurity = false or c.relforcerowsecurity = false)
      `;
      expect(rows).toEqual([]);
    });
  });

  it("SG-02: app_user has no bypassrls and owns no tables", async () => {
    await withSystem("SG-02 schema guard", async (tx) => {
      const role = await tx<{ rolbypassrls: boolean }[]>`
        select rolbypassrls from pg_roles where rolname = 'app_user'
      `;
      expect(role[0]?.rolbypassrls).toBe(false);

      const owned = await tx<{ relname: string }[]>`
        select c.relname
        from pg_class c
        join pg_roles r on r.oid = c.relowner
        where r.rolname = 'app_user' and c.relkind = 'r'
      `;
      expect(owned).toEqual([]);
    });
  });

  it("SG-03: migrations contain no banned identifiers", () => {
    const banned = /\b(auth\.|storage\.|supabase_|pgsodium|vault\.|pg_net|pg_cron)\b/;
    for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"))) {
      const body = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      expect(banned.test(body), file).toBe(false);
    }
  });

  it("SG-04: extensions ⊆ allowlist", async () => {
    const allow = new Set([
      "pgcrypto",
      "citext",
      "pg_trgm",
      "uuid-ossp",
      "vector",
      "plpgsql",
    ]);
    await withSystem("SG-04 schema guard", async (tx) => {
      const rows = await tx<{ extname: string }[]>`select extname from pg_extension`;
      for (const row of rows) {
        expect(allow.has(row.extname), row.extname).toBe(true);
      }
    });
  });

  it("SG-06: secondary tenant indexes lead with org_id", async () => {
    await withSystem("SG-06 schema guard", async (tx) => {
      const bad = await tx<{ indexrelname: string }[]>`
        select i.relname as indexrelname
        from pg_index x
        join pg_class i on i.oid = x.indexrelid
        join pg_class t on t.oid = x.indrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relkind = 'r'
          and exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = t.relname
              and column_name = 'org_id'
          )
          and not x.indisprimary
          and (
            select a.attname
            from unnest(x.indkey) with ordinality as k(attnum, ord)
            join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
            where k.ord = 1
          ) is distinct from 'org_id'
          and i.relname not like '%_uidx'
          and i.relname not like '%_key'
          and i.relname not in (
            'org_member_user_id_idx',
            'job_outbox_state_available_idx',
            'brand_voice_one_active'
          )
      `;
      expect(bad).toEqual([]);
    });
  });
});

describe.skipIf(!hasDb)("RLS matrix (Neon)", () => {
  afterAll(async () => {
    await closeDbClients();
  });

  async function seedTwoOrgs() {
    return withSystem("seed two orgs for RLS", async (tx) => {
      const suffix = crypto.randomUUID().slice(0, 8);

      const uA = requireRow(
        await tx<{ id: string }[]>`
          insert into user_account (external_auth_id, email, display_name)
          values (${`user_a_${suffix}`}, ${`a_${suffix}@test.local`}, 'A')
          returning id
        `,
        "user A",
      ).id;
      const uB = requireRow(
        await tx<{ id: string }[]>`
          insert into user_account (external_auth_id, email, display_name)
          values (${`user_b_${suffix}`}, ${`b_${suffix}@test.local`}, 'B')
          returning id
        `,
        "user B",
      ).id;

      const orgA = requireRow(
        await tx<{ id: string }[]>`
          insert into org (name, slug) values (${`Org A ${suffix}`}, ${`org-a-${suffix}`})
          returning id
        `,
        "org A",
      ).id;
      const orgB = requireRow(
        await tx<{ id: string }[]>`
          insert into org (name, slug) values (${`Org B ${suffix}`}, ${`org-b-${suffix}`})
          returning id
        `,
        "org B",
      ).id;

      await tx`
        insert into org_member (org_id, user_id, role) values
          (${orgA}, ${uA}, 'owner'),
          (${orgB}, ${uB}, 'owner')
      `;

      await tx`
        insert into brand (org_id, name, slug)
        values
          (${orgA}, 'Brand A', ${`brand-a-${suffix}`}),
          (${orgB}, 'Brand B', ${`brand-b-${suffix}`})
      `;

      return { orgA, orgB, uA, uB, suffix };
    });
  }

  it("RLS-SEL: org B cannot see org A brands", async () => {
    const { orgA, orgB, uA, uB } = await seedTwoOrgs();

    const seenByA = await withTenant({ orgId: orgA, userId: uA }, async (tx) => {
      return tx<{ name: string }[]>`select name from brand`;
    });
    expect(seenByA.some((r) => r.name === "Brand A")).toBe(true);

    const seenByB = await withTenant({ orgId: orgB, userId: uB }, async (tx) => {
      return tx<{ name: string }[]>`select name from brand`;
    });
    expect(seenByB.some((r) => r.name === "Brand A")).toBe(false);
  });

  it("RLS-INS: insert with foreign org_id fails", async () => {
    const { orgA, orgB, uA } = await seedTwoOrgs();

    await expect(
      withTenant({ orgId: orgA, userId: uA }, async (tx) => {
        await tx`
          insert into brand (org_id, name, slug)
          values (${orgB}, 'Evil', 'evil')
        `;
      }),
    ).rejects.toThrow();
  });

  it("RLS-NOCTX: without tenant GUC, select returns empty under app_user", async () => {
    const { orgA, uA } = await seedTwoOrgs();
    await withTenant({ orgId: orgA, userId: uA }, async (tx) => {
      const rows = await tx`select id from brand`;
      expect(rows.length).toBeGreaterThan(0);
    });

    await withSystem("RLS-NOCTX probe", async (tx) => {
      await tx`select set_config('app.current_org_id', '', true)`;
      await tx`select set_config('app.current_user_id', '', true)`;
      await tx`set local role app_user`;
      const rows = await tx`select id from brand`;
      expect(rows).toEqual([]);
    });
  });

  it("DB-02: transaction-local GUC does not leak after commit", async () => {
    const { orgA, uA } = await seedTwoOrgs();
    await withTenant({ orgId: orgA, userId: uA }, async (tx) => {
      await tx`select 1`;
    });

    await withSystem("DB-02 probe", async (tx) => {
      const guc = await tx<{ v: string | null }[]>`
        select current_setting('app.current_org_id', true) as v
      `;
      expect(guc[0]?.v === null || guc[0]?.v === "").toBe(true);
    });
  });

  it("D-20: withSystem writes audit_log with reason", async () => {
    const reason = `audit-test-${crypto.randomUUID()}`;
    await withSystem(reason, async () => undefined);

    await withSystem("read audit", async (tx) => {
      const rows = await tx<{ meta: { reason?: string } }[]>`
        select meta from audit_log
        where action = 'with_system'
        order by id desc
        limit 20
      `;
      expect(rows.some((r) => r.meta?.reason === reason)).toBe(true);
    });
  });
});

describe("package exports", () => {
  it("D-18: raw db clients are not exported", async () => {
    const mod = await import("../index");
    expect("getAppDb" in mod).toBe(false);
    expect("getOwnerDb" in mod).toBe(false);
    expect("rawDb" in mod).toBe(false);
    expect(typeof mod.withTenant).toBe("function");
    expect(typeof mod.withSystem).toBe("function");
  });
});
