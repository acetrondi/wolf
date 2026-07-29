export const ORG_ROLES = ["owner", "admin", "editor", "viewer"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export type TenantCtx = {
  userId: string;
  orgId: string;
  role: OrgRole;
};

export const ACTIONS = [
  "brand:read",
  "brand:write",
  "brand:*",
  "plan:read",
  "plan:write",
  "plan:*",
  "variant:read",
  "variant:write",
  "variant:approve",
  "variant:*",
  "member:invite",
  "member:manage",
  "integration:read",
  "integration:write",
  "integration:*",
] as const;

export type Action = (typeof ACTIONS)[number];

export type Membership = {
  orgId: string;
  orgName: string;
  role: OrgRole;
  createdAt: string;
};
