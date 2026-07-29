"use server";

import { withTenant } from "@wolf/db";
import { cookies } from "next/headers";
import { z } from "zod";

import { ACTIVE_BRAND_COOKIE } from "@/lib/brands/active-brand";
import { resolveTenantContext } from "@/lib/tenant/resolve-tenant-context";

const BrandIdSchema = z.string().uuid();

export async function setActiveBrand(brandId: string): Promise<boolean> {
  const parsedBrandId = BrandIdSchema.safeParse(brandId);
  if (!parsedBrandId.success) return false;

  const ctx = await resolveTenantContext();
  if (!ctx.ok) return false;

  const belongsToTenant = await withTenant(ctx.value, async (tx) => {
    const rows = await tx<{ id: string }[]>`
      select id::text
      from brand
      where id = ${parsedBrandId.data}::uuid and deleted_at is null
      limit 1
    `;
    return rows.length === 1;
  });
  if (!belongsToTenant) return false;

  (await cookies()).set(ACTIVE_BRAND_COOKIE, parsedBrandId.data, {
    httpOnly: true,
    sameSite: "lax",
    path: "/app",
    maxAge: 60 * 60 * 24 * 365,
  });
  return true;
}
