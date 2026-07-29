import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listBrands } from "@/lib/brands/actions";

export default async function BrandsPage() {
  const result = await listBrands();
  const brands = result.ok ? result.value : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">Each brand has a versioned voice spec.</p>
        </div>
        <Button render={<Link href="/app/brands/new" />}>New brand</Button>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {brands.length === 0 ? (
          <li className="p-6 text-sm text-muted-foreground">No brands yet.</li>
        ) : (
          brands.map((brand) => (
            <li key={brand.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{brand.name}</p>
                <p className="text-sm text-muted-foreground">{brand.slug}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={
                      brand.hasVoice
                        ? `/app/brands/${brand.id}`
                        : `/app/brands/${brand.id}/voice/onboarding`
                    }
                  />
                }
              >
                {brand.hasVoice ? "View" : "Set up voice"}
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
