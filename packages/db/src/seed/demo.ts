import { withSystem } from "../tenant";
import { seedPlatforms } from "./platforms";

function requireRow<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`Expected ${label} row`);
  return row;
}

export async function seedDemoOrg(): Promise<{
  orgId: string;
  userId: string;
  brandId: string;
}> {
  await seedPlatforms();

  return withSystem("seed demo org", async (tx) => {
    const existing = await tx<{ id: string }[]>`
      select id from org where slug = 'demo' limit 1
    `;
    if (existing[0]) {
      const orgId = existing[0].id;
      const user = await tx<{ id: string }[]>`
        select user_id as id from org_member where org_id = ${orgId} limit 1
      `;
      const brand = await tx<{ id: string }[]>`
        select id from brand where org_id = ${orgId} and slug = 'demo-brand' limit 1
      `;
      return {
        orgId,
        userId: user[0]?.id ?? "",
        brandId: brand[0]?.id ?? "",
      };
    }

    const users = await tx<{ id: string }[]>`
      insert into user_account (external_auth_id, email, display_name)
      values ('demo_clerk_user', 'demo@wolf.local', 'Demo User')
      on conflict (external_auth_id) do update
        set email = excluded.email
      returning id
    `;
    const userId = requireRow(users, "user_account").id;

    const orgs = await tx<{ id: string }[]>`
      insert into org (name, slug, plan, is_personal)
      values ('Demo Org', 'demo', 'free', true)
      returning id
    `;
    const orgId = requireRow(orgs, "org").id;

    await tx`
      insert into org_member (org_id, user_id, role)
      values (${orgId}, ${userId}, 'owner')
    `;

    const brands = await tx<{ id: string }[]>`
      insert into brand (org_id, name, slug, description)
      values (
        ${orgId},
        'Demo Brand',
        'demo-brand',
        'Seed brand for local development'
      )
      returning id
    `;
    const brandId = requireRow(brands, "brand").id;

    await tx`
      insert into brand_voice (
        org_id, brand_id, version, is_active, spec, compiled_card, card_hash, created_by
      )
      values (
        ${orgId},
        ${brandId},
        1,
        true,
        ${tx.json({ axes: { formality: 3 } })},
        'Demo voice card',
        'demo-card-hash',
        ${userId}
      )
    `;

    return { orgId, userId, brandId };
  });
}
