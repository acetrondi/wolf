"use client";

import { Building2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { setActiveBrand } from "@/lib/brands/active-brand-actions";

type BrandOption = {
  id: string;
  name: string;
};

export function BrandSwitcher({
  brands,
  activeBrandId,
}: {
  brands: BrandOption[];
  activeBrandId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedBrandId, setSelectedBrandId] = useState(activeBrandId ?? "");

  useEffect(() => {
    setSelectedBrandId(activeBrandId ?? "");
  }, [activeBrandId]);

  function selectBrand(brandId: string) {
    setSelectedBrandId(brandId);
    startTransition(async () => {
      const didChange = await setActiveBrand(brandId);
      if (didChange) router.refresh();
    });
  }

  return (
    <SidebarGroup className="mt-auto">
      <SidebarGroupLabel>Selected brand</SidebarGroupLabel>
      <SidebarGroupContent>
        {brands.length > 0 ? (
          <div className="relative">
            <Building2Icon
              className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              value={selectedBrandId}
              onChange={(event) => selectBrand(event.target.value)}
              disabled={isPending}
              aria-label="Selected brand"
              className="h-9 w-full rounded-md border border-sidebar-border bg-sidebar pr-2 pl-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-60"
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <a
            href="/app/brands/new"
            className="block rounded-md border border-dashed border-sidebar-border px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Create your first brand
          </a>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
