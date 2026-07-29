import type { Action, OrgRole } from "@wolf/contracts";
import { describe, expect, it } from "vitest";

import { authorize } from "../authorize";

const MATRIX_CASES: {
  role: OrgRole;
  action: Action;
  allowed: boolean;
}[] = [
  { role: "owner", action: "brand:read", allowed: true },
  { role: "owner", action: "member:manage", allowed: true },
  { role: "admin", action: "brand:write", allowed: true },
  { role: "admin", action: "member:manage", allowed: false },
  { role: "editor", action: "variant:write", allowed: true },
  { role: "editor", action: "variant:read", allowed: false },
  { role: "viewer", action: "plan:read", allowed: true },
  { role: "viewer", action: "plan:write", allowed: false },
];

describe("authorize", () => {
  it.each(MATRIX_CASES)(
    "A-11: $role on $action => $allowed",
    ({ role, action, allowed }) => {
      const result = authorize({ userId: "u", orgId: "o", role }, action);
      expect(result.ok).toBe(allowed);
    },
  );
});
