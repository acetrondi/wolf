import "server-only";

import { type TenantCtx, withTenant } from "@wolf/db";
import { cookies } from "next/headers";

export const ACTIVE_BRAND_COOKIE = "active_brand";

export type BrandOption = {
  id: string;
  name: string;
};

export async function getActiveBrandSelection(ctx: TenantCtx): Promise<{
  brands: BrandOption[];
  activeBrand: BrandOption | null;
}> {
  const brands = await withTenant(
    ctx,
    (tx) =>
      tx<BrandOption[]>`
      select id::text, name
      from brand
      where deleted_at is null
      order by created_at asc
    `,
  );
  const activeBrandId = (await cookies()).get(ACTIVE_BRAND_COOKIE)?.value;
  const activeBrand =
    brands.find((brand) => brand.id === activeBrandId) ?? brands[0] ?? null;

  return { brands, activeBrand };
}
