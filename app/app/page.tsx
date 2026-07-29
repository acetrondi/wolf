import { withTenant } from "@wolf/db";
import Link from "next/link";

import { resolveTenantContext } from "@/lib/tenant/resolve-tenant-context";

export default async function AppHomePage() {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return null;

  const stats = await withTenant(ctx.value, async (tx) => {
    const brands = await tx<{ count: string }[]>`
      select count(*)::text as count from brand where deleted_at is null
    `;
    return { brandCount: brands[0]?.count ?? "0" };
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{ctx.value.role}</span> in org{" "}
          <span className="font-mono text-sm">{ctx.value.orgId}</span>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Brands</p>
          <p className="mt-2 text-3xl font-semibold">{stats.brandCount}</p>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Tenant gate</p>
          <p className="mt-2 text-sm text-foreground">
            Requests use <code className="font-mono">withTenant</code> with your active
            org.
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        <Link href="/app/brands" className="underline underline-offset-4">
          Manage brands
        </Link>
        {" · "}
        <Link href="/" className="underline underline-offset-4">
          Marketing site
        </Link>
      </p>
    </div>
  );
}
