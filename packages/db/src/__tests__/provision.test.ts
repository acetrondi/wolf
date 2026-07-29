import { afterAll, describe, expect, it } from "vitest";

import {
  closeDbClients,
  provisionClerkUser,
  recordWebhookEvent,
  slugFromEmail,
  uniqueOrgSlug,
  withSystem,
} from "../index";

const hasDb = Boolean(process.env.DATABASE_URL?.trim());

describe.skipIf(!hasDb)("auth provisioning (Neon)", () => {
  afterAll(async () => {
    await closeDbClients();
  });

  it("A-01: user.created provisions user, personal org, owner membership", async () => {
    const externalAuthId = `test_${crypto.randomUUID()}`;
    const email = `a-${crypto.randomUUID().slice(0, 8)}@wolf.test`;

    const { userId, orgId } = await withSystem("A-01 provision", (tx) =>
      provisionClerkUser(tx, {
        externalAuthId,
        email,
        displayName: "Test User",
      }),
    );

    const counts = await withSystem("A-01 verify", async (tx) => {
      const users = await tx<{ n: number }[]>`
        select count(*)::int as n from user_account where id = ${userId}::uuid
      `;
      const orgs = await tx<{ n: number }[]>`
        select count(*)::int as n from org where id = ${orgId}::uuid and is_personal = true
      `;
      const members = await tx<{ n: number }[]>`
        select count(*)::int as n
        from org_member
        where org_id = ${orgId}::uuid and user_id = ${userId}::uuid and role = 'owner'
      `;
      return {
        users: users[0]?.n ?? 0,
        orgs: orgs[0]?.n ?? 0,
        members: members[0]?.n ?? 0,
      };
    });

    expect(counts).toEqual({ users: 1, orgs: 1, members: 1 });
  });

  it("A-02: replayed provision is a no-op", async () => {
    const externalAuthId = `test_${crypto.randomUUID()}`;
    const email = `b-${crypto.randomUUID().slice(0, 8)}@wolf.test`;

    await withSystem("A-02 first", (tx) =>
      provisionClerkUser(tx, { externalAuthId, email }),
    );
    await withSystem("A-02 replay", (tx) =>
      provisionClerkUser(tx, { externalAuthId, email }),
    );

    const counts = await withSystem("A-02 verify", async (tx) => {
      const users = await tx<{ n: number }[]>`
        select count(*)::int as n from user_account where external_auth_id = ${externalAuthId}
      `;
      const orgs = await tx<{ n: number }[]>`
        select count(*)::int as n
        from org o
        join org_member om on om.org_id = o.id
        join user_account u on u.id = om.user_id
        where u.external_auth_id = ${externalAuthId} and o.is_personal = true
      `;
      return { users: users[0]?.n ?? 0, orgs: orgs[0]?.n ?? 0 };
    });

    expect(counts).toEqual({ users: 1, orgs: 1 });
  });

  it("A-05: same email prefix gets unique slugs", async () => {
    const prefix = crypto.randomUUID().slice(0, 8);
    const emailA = `${prefix}.one@wolf.test`;
    const emailB = `${prefix}.two@wolf.test`;
    const externalA = `a_${crypto.randomUUID()}`;
    const externalB = `b_${crypto.randomUUID()}`;

    const first = await withSystem("A-05 a", (tx) =>
      provisionClerkUser(tx, { externalAuthId: externalA, email: emailA }),
    );
    const second = await withSystem("A-05 b", (tx) =>
      provisionClerkUser(tx, { externalAuthId: externalB, email: emailB }),
    );

    const slugs = await withSystem("A-05 slugs", async (tx) => {
      const rows = await tx<{ slug: string }[]>`
        select slug::text
        from org
        where id in (${first.orgId}::uuid, ${second.orgId}::uuid)
      `;
      return rows.map((r) => r.slug);
    });

    expect(new Set(slugs).size).toBe(2);
    expect(slugs).toContain(slugFromEmail(emailA));
    expect(slugs).toContain(slugFromEmail(emailB));
  });

  it("webhook dedupe marks duplicates", async () => {
    const externalId = `evt_${crypto.randomUUID()}`;
    const first = await withSystem("dedupe first", (tx) =>
      recordWebhookEvent(tx, externalId, "user.created"),
    );
    const second = await withSystem("dedupe second", (tx) =>
      recordWebhookEvent(tx, externalId, "user.created"),
    );
    expect(first).toBe("new");
    expect(second).toBe("duplicate");
  });

  it("uniqueOrgSlug suffixes collisions", async () => {
    const base = `slug-${crypto.randomUUID().slice(0, 6)}`;
    await withSystem("slug seed", async (tx) => {
      await tx`insert into org (name, slug, is_personal) values ('One', ${base}, true)`;
    });
    const next = await withSystem("slug next", (tx) => uniqueOrgSlug(tx, base));
    expect(next).toBe(`${base}-1`);
  });
});
