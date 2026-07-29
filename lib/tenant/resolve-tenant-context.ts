import { auth, currentUser } from "@clerk/nextjs/server";
import type { AppError, Result, TenantCtx } from "@wolf/contracts";
import { err, ok } from "@wolf/contracts";
import { pickActiveMembership } from "@wolf/core";
import { findUserWithMemberships, provisionClerkUser, withSystem } from "@wolf/db";
import { cookies } from "next/headers";
import { cache } from "react";

const ACTIVE_ORG_COOKIE = "active_org";

export const resolveTenantContext = cache(
  async (): Promise<Result<TenantCtx, AppError>> => {
    const { userId: externalId } = await auth();
    if (!externalId) {
      return err({ kind: "forbidden", action: "authenticate" });
    }

    let row = await withSystem("resolve tenant context", (tx) =>
      findUserWithMemberships(tx, externalId),
    );

    if (!row) {
      const clerkUser = await currentUser();
      const email = clerkUser?.primaryEmailAddress?.emailAddress;
      if (!email) {
        return err({ kind: "forbidden", action: "authenticate" });
      }

      await withSystem("self-heal clerk user", (tx) =>
        provisionClerkUser(tx, {
          externalAuthId: externalId,
          email,
          displayName: clerkUser?.fullName,
          avatarUrl: clerkUser?.imageUrl,
        }),
      );

      row = await withSystem("resolve tenant context", (tx) =>
        findUserWithMemberships(tx, externalId),
      );
    }

    if (!row) {
      return err({ kind: "forbidden", action: "authenticate" });
    }

    const cookieStore = await cookies();
    const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
    const membership = pickActiveMembership(row.memberships, activeOrgId);

    if (!membership) {
      return err({ kind: "forbidden", action: "access_org" });
    }

    return ok({
      userId: row.id,
      orgId: membership.orgId,
      role: membership.role,
    });
  },
);

export { ACTIVE_ORG_COOKIE };
