import type { Action, AppError, Membership, OrgRole, TenantCtx } from "@wolf/contracts";
import { err, ok, type Result } from "@wolf/contracts";

const MATRIX: Record<OrgRole, readonly (Action | "*")[]> = {
  owner: ["*"],
  admin: ["brand:*", "plan:*", "variant:*", "member:invite", "integration:*"],
  editor: ["brand:read", "plan:*", "variant:write", "variant:approve"],
  viewer: ["brand:read", "plan:read", "variant:read"],
};

function allows(role: OrgRole, action: Action): boolean {
  const grants = MATRIX[role];
  if (grants.includes("*")) return true;
  if (grants.includes(action)) return true;
  const [resource] = action.split(":");
  return grants.includes(`${resource}:*` as Action);
}

export function authorize(ctx: TenantCtx, action: Action): Result<void, AppError> {
  if (!allows(ctx.role, action)) {
    return err({ kind: "forbidden", action });
  }
  return ok(undefined);
}

/** Pick membership from cookie hint; undefined when cookie is invalid. */
export function pickActiveMembership(
  memberships: Membership[],
  activeOrgId: string | undefined,
): Membership | undefined {
  if (!memberships.length) return undefined;
  if (activeOrgId) {
    return memberships.find((m) => m.orgId === activeOrgId);
  }
  const sorted = [...memberships].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.orgId.localeCompare(b.orgId),
  );
  return sorted[0];
}
