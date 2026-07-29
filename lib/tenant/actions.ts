"use server";

import { randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import type { AppError, OrgRole } from "@wolf/contracts";
import { err, ok, type Result } from "@wolf/contracts";
import { authorize } from "@wolf/core";
import { findUserWithMemberships, withSystem, withTenant } from "@wolf/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { ACTIVE_ORG_COOKIE, resolveTenantContext } from "./resolve-tenant-context";

export async function switchActiveOrg(orgId: string): Promise<Result<void, AppError>> {
  const { userId: externalId } = await auth();
  if (!externalId) {
    return err({ kind: "forbidden", action: "authenticate" });
  }

  const memberships = await withSystem("switch org lookup", (tx) =>
    findUserWithMemberships(tx, externalId),
  );
  if (!memberships?.memberships.some((m) => m.orgId === orgId)) {
    return err({ kind: "forbidden", action: "access_org" });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");
  return ok(undefined);
}

export async function createOrgInvite(
  email: string,
  role: OrgRole = "editor",
): Promise<Result<{ token: string }, AppError>> {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return ctx;

  const allowed = authorize(ctx.value, "member:invite");
  if (!allowed.ok) return allowed;

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await withTenant(ctx.value, async (tx) => {
    await tx`
      insert into org_invite (org_id, email, role, token, invited_by, expires_at)
      values (
        ${ctx.value.orgId},
        ${email},
        ${role}::org_role,
        ${token},
        ${ctx.value.userId},
        ${expiresAt.toISOString()}
      )
    `;
  });

  return ok({ token });
}

export async function acceptOrgInvite(token: string): Promise<Result<void, AppError>> {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return ctx;

  const invite = await withSystem("accept invite lookup", async (tx) => {
    const rows = await tx<
      {
        id: string;
        orgId: string;
        email: string;
        role: OrgRole;
        expiresAt: Date;
        acceptedAt: Date | null;
      }[]
    >`
      select
        id::text,
        org_id as "orgId",
        email::text,
        role::text as role,
        expires_at as "expiresAt",
        accepted_at as "acceptedAt"
      from org_invite
      where token = ${token}
      limit 1
    `;
    return rows[0] ?? null;
  });

  if (!invite) {
    return err({ kind: "not_found", resource: "invite" });
  }
  if (invite.acceptedAt) {
    return err({ kind: "conflict", message: "Invite already accepted" });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return err({ kind: "validation", message: "Invite expired" });
  }

  const userEmail = await withSystem("accept invite user email", async (tx) => {
    const rows = await tx<{ email: string }[]>`
      select email::text from user_account where id = ${ctx.value.userId} limit 1
    `;
    return rows[0]?.email ?? null;
  });

  if (!userEmail || userEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return err({ kind: "forbidden", action: "accept_invite" });
  }

  await withSystem("accept invite", async (tx) => {
    await tx`
      insert into org_member (org_id, user_id, role)
      values (${invite.orgId}, ${ctx.value.userId}, ${invite.role}::org_role)
      on conflict (org_id, user_id) do update set role = excluded.role
    `;
    await tx`
      update org_invite
      set accepted_at = now(), accepted_by = ${ctx.value.userId}
      where id = ${invite.id}::uuid
    `;
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, invite.orgId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");
  return ok(undefined);
}
