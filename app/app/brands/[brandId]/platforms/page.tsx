import { BrandPlatformGuidanceSchema } from "@wolf/contracts";
import { withTenant } from "@wolf/db";
import { PLATFORM_REGISTRY } from "@wolf/platforms";
import { notFound } from "next/navigation";

import { PlatformGuidanceForm } from "@/components/platforms/platform-guidance-form";
import { resolveTenantContext } from "@/lib/tenant/resolve-tenant-context";

type Props = { params: Promise<{ brandId: string }> };

export default async function BrandPlatformsPage({ params }: Props) {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return null;
  const { brandId } = await params;
  const profiles = await withTenant(ctx.value, async (tx) => {
    const brand = await tx<{ id: string }[]>`
      select id::text from brand where id = ${brandId}::uuid and deleted_at is null limit 1
    `;
    if (!brand[0]) return null;
    return tx<{ slug: string; isEnabled: boolean; guidance: unknown }[]>`
      select p.slug, bpp.is_enabled as "isEnabled", bpp.content_guidance as guidance
      from brand_platform_profile bpp
      join platform p on p.id = bpp.platform_id
      where bpp.brand_id = ${brandId}::uuid
    `;
  });
  if (!profiles) notFound();

  const initialProfiles = Object.fromEntries(
    profiles.map((profile) => [
      profile.slug,
      {
        isEnabled: profile.isEnabled,
        guidance: BrandPlatformGuidanceSchema.parse(profile.guidance),
      },
    ]),
  );

  return (
    <PlatformGuidanceForm
      brandId={brandId}
      platforms={PLATFORM_REGISTRY.map((platform) => ({
        slug: platform.slug,
        name: platform.name,
        promoNote: platform.promo.notes,
        supportsTitle: platform.editor.title,
        supportsSubtitle: platform.editor.subtitle,
      }))}
      profiles={initialProfiles}
    />
  );
}
