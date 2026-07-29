import type { Membership } from "@wolf/contracts";
import { describe, expect, it } from "vitest";

import { pickActiveMembership } from "../authorize";

const memberships: Membership[] = [
  {
    orgId: "11111111-1111-4111-8111-111111111111",
    orgName: "First",
    role: "owner",
    createdAt: "2024-01-02T00:00:00.000Z",
  },
  {
    orgId: "22222222-2222-4222-8222-222222222222",
    orgName: "Second",
    role: "editor",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

describe("pickActiveMembership", () => {
  it("A-10: absent cookie falls back to earliest membership", () => {
    const picked = pickActiveMembership(memberships, undefined);
    expect(picked?.orgId).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("A-08: cookie for org user does not belong to is rejected", () => {
    const picked = pickActiveMembership(
      memberships,
      "99999999-9999-4999-8999-999999999999",
    );
    expect(picked).toBeUndefined();
  });

  it("A-09: cookie for unknown uuid is rejected", () => {
    const picked = pickActiveMembership(
      memberships,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(picked).toBeUndefined();
  });
});
