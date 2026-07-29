import type { Membership, OrgRole } from "@wolf/contracts";

import type { Tx } from "./types";

function requireRow<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`Expected ${label}`);
  return row;
}

export function slugFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "user";
  const slug = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "user";
}

export async function uniqueOrgSlug(tx: Tx, base: string): Promise<string> {
  let slug = base;
  let suffix = 0;
  while (true) {
    const existing = await tx<{ n: number }[]>`
      select 1 as n from org where slug = ${slug} limit 1
    `;
    if (!existing.length) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export type ProvisionInput = {
  externalAuthId: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

/** Idempotent: one user_account + one personal org + owner membership. */
export async function provisionClerkUser(
  tx: Tx,
  input: ProvisionInput,
): Promise<{ userId: string; orgId: string }> {
  const users = await tx<{ id: string }[]>`
    insert into user_account (external_auth_id, email, display_name, avatar_url)
    values (
      ${input.externalAuthId},
      ${input.email},
      ${input.displayName ?? null},
      ${input.avatarUrl ?? null}
    )
    on conflict (external_auth_id) do update set
      email = excluded.email,
      display_name = coalesce(excluded.display_name, user_account.display_name),
      avatar_url = coalesce(excluded.avatar_url, user_account.avatar_url),
      updated_at = now(),
      deleted_at = null
    returning id
  `;
  const userId = requireRow(users, "user_account").id;

  const personal = await tx<{ id: string }[]>`
    select o.id
    from org o
    join org_member om on om.org_id = o.id
    where om.user_id = ${userId} and o.is_personal = true
    limit 1
  `;
  if (personal[0]) {
    return { userId, orgId: personal[0].id };
  }

  const baseSlug = await uniqueOrgSlug(tx, slugFromEmail(input.email));
  const orgName = input.displayName?.trim() || `${baseSlug}'s workspace`;

  const orgs = await tx<{ id: string }[]>`
    insert into org (name, slug, is_personal)
    values (${orgName}, ${baseSlug}, true)
    returning id
  `;
  const orgId = requireRow(orgs, "org").id;

  await tx`
    insert into org_member (org_id, user_id, role)
    values (${orgId}, ${userId}, 'owner')
    on conflict do nothing
  `;

  return { userId, orgId };
}

export type UserWithMemberships = {
  id: string;
  email: string;
  memberships: Membership[];
};

export async function findUserWithMemberships(
  tx: Tx,
  externalAuthId: string,
): Promise<UserWithMemberships | null> {
  const users = await tx<{ id: string; email: string }[]>`
    select id, email::text
    from user_account
    where external_auth_id = ${externalAuthId}
      and deleted_at is null
    limit 1
  `;
  const user = users[0];
  if (!user) return null;

  const memberships = await tx<
    { orgId: string; orgName: string; role: OrgRole; createdAt: Date }[]
  >`
    select
      o.id as "orgId",
      o.name as "orgName",
      om.role::text as role,
      om.created_at as "createdAt"
    from org_member om
    join org o on o.id = om.org_id
    where om.user_id = ${user.id}
    order by om.created_at asc, o.id asc
  `;

  return {
    id: user.id,
    email: user.email,
    memberships: memberships.map((m) => ({
      orgId: m.orgId,
      orgName: m.orgName,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function updateClerkUser(
  tx: Tx,
  input: {
    externalAuthId: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  },
): Promise<void> {
  await tx`
    update user_account
    set
      email = ${input.email},
      display_name = coalesce(${input.displayName ?? null}, display_name),
      avatar_url = coalesce(${input.avatarUrl ?? null}, avatar_url),
      updated_at = now()
    where external_auth_id = ${input.externalAuthId}
      and deleted_at is null
  `;
}

export async function softDeleteClerkUser(tx: Tx, externalAuthId: string): Promise<void> {
  await tx`
    update user_account
    set deleted_at = now(), updated_at = now()
    where external_auth_id = ${externalAuthId}
      and deleted_at is null
  `;
}

export async function recordWebhookEvent(
  tx: Tx,
  externalId: string,
  eventType: string,
): Promise<"new" | "duplicate"> {
  const rows = await tx<{ id: string }[]>`
    insert into webhook_event (external_id, event_type)
    values (${externalId}, ${eventType})
    on conflict (external_id) do nothing
    returning id::text
  `;
  return rows.length ? "new" : "duplicate";
}
