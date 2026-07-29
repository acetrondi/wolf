import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { findUserWithMemberships, withSystem } from "@wolf/db";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { OrgSwitcher } from "@/components/org-switcher";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getActiveBrandSelection } from "@/lib/brands/active-brand";
import { resolveTenantContext } from "@/lib/tenant/resolve-tenant-context";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) redirect("/auth/sign-in");
  const { userId: externalId } = await auth();
  const userRow = externalId
    ? await withSystem("app shell memberships", (tx) =>
        findUserWithMemberships(tx, externalId),
      )
    : null;
  const { brands, activeBrand } = await getActiveBrandSelection(ctx.value);

  return (
    <SidebarProvider
      style={
        { "--sidebar-width": "18rem", "--header-height": "4rem" } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        brands={brands}
        activeBrandId={activeBrand?.id ?? null}
      />
      <SidebarInset>
        <header className="flex h-(--header-height) items-center justify-between border-b bg-background px-4 lg:px-6">
          <OrgSwitcher
            memberships={userRow?.memberships ?? []}
            activeOrgId={ctx.value.orgId}
          />
          <UserButton />
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
