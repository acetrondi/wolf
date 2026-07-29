import { withTenant } from "@wolf/db";
import { notFound } from "next/navigation";

import { VoiceOnboardingWizard } from "@/components/voice/onboarding-wizard";
import { resolveTenantContext } from "@/lib/tenant/resolve-tenant-context";

type PageProps = {
  params: Promise<{ brandId: string }>;
};

export default async function VoiceOnboardingPage({ params }: PageProps) {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return null;

  const { brandId } = await params;
  const brand = await withTenant(ctx.value, async (tx) => {
    const rows = await tx<{ name: string }[]>`
      select name from brand
      where id = ${brandId}::uuid and deleted_at is null
      limit 1
    `;
    return rows[0] ?? null;
  });

  if (!brand) notFound();

  return <VoiceOnboardingWizard brandId={brandId} brandName={brand.name} />;
}
