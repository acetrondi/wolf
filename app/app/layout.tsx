import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { findUserWithMemberships, withSystem } from "@wolf/db";
import { redirect } from "next/navigation";

import { OrgSwitcher } from "@/components/org-switcher";
import { resolveTenantContext } from "@/lib/tenant/resolve-tenant-context";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) {
    redirect("/auth/sign-in");
  }

  const { userId: externalId } = await auth();
  const userRow = externalId
    ? await withSystem("app shell memberships", (tx) =>
        findUserWithMemberships(tx, externalId),
      )
    : null;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight">Wolf</span>
          <OrgSwitcher
            memberships={userRow?.memberships ?? []}
            activeOrgId={ctx.value.orgId}
          />
        </div>
        <UserButton />
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
