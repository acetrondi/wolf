"use client";

import type { Membership } from "@wolf/contracts";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { switchActiveOrg } from "@/lib/tenant/actions";

type OrgSwitcherProps = {
  memberships: Membership[];
  activeOrgId: string;
};

export function OrgSwitcher({ memberships, activeOrgId }: OrgSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (memberships.length <= 1) {
    const active = memberships.find((m) => m.orgId === activeOrgId);
    return (
      <span className="text-sm font-medium text-foreground">
        {active?.orgName ?? "Workspace"}
      </span>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Workspace</span>
      <select
        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
        value={activeOrgId}
        disabled={pending}
        onChange={(event) => {
          const orgId = event.target.value;
          startTransition(async () => {
            await switchActiveOrg(orgId);
            router.refresh();
          });
        }}
      >
        {memberships.map((membership) => (
          <option key={membership.orgId} value={membership.orgId}>
            {membership.orgName}
          </option>
        ))}
      </select>
    </label>
  );
}
