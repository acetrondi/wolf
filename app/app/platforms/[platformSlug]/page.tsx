import { BrandPlatformGuidanceSchema } from "@wolf/contracts";
import { withTenant } from "@wolf/db";
import { PLATFORM_BY_SLUG } from "@wolf/platforms";
import { notFound } from "next/navigation";

import { PlatformRulesPanel } from "@/components/platforms/platform-rules-panel";
import { getActiveBrandSelection } from "@/lib/brands/active-brand";
import { resolveTenantContext } from "@/lib/tenant/resolve-tenant-context";

const capabilityLabels = {
  headings: "Headings",
  codeBlocks: "Code blocks",
  inlineFormatting: "Inline formatting",
  lists: "Lists",
  quotes: "Quotes",
  canonicalUrl: "Canonical URLs",
  coverImage: "Cover images",
  markdown: "Markdown",
} as const;

type Props = {
  params: Promise<{ platformSlug: string }>;
};

export default async function PlatformPage({ params }: Props) {
  const { platformSlug } = await params;
  const platform = PLATFORM_BY_SLUG.get(platformSlug);
  if (!platform) notFound();

  const ctx = await resolveTenantContext();
  const { activeBrand } = ctx.ok
    ? await getActiveBrandSelection(ctx.value)
    : { activeBrand: null };
  const profile =
    ctx.ok && activeBrand
      ? await withTenant(ctx.value, async (tx) => {
          const rows = await tx<{ guidance: unknown; isEnabled: boolean }[]>`
            select
              bpp.content_guidance as guidance,
              bpp.is_enabled as "isEnabled"
            from brand_platform_profile bpp
            join platform p on p.id = bpp.platform_id
            where bpp.brand_id = ${activeBrand.id}::uuid
              and p.slug = ${platform.slug}
            limit 1
          `;
          return rows[0] ?? null;
        })
      : null;
  const supportedCapabilities = Object.entries(platform.supports)
    .filter(([, supported]) => supported)
    .map(([capability]) => capabilityLabels[capability as keyof typeof capabilityLabels]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Platforms</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{platform.name}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{platform.headline.note}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Post length</p>
          <p className="mt-2 text-xl font-semibold">
            {platform.limits.bodyChars
              ? `${platform.limits.bodyChars[0]}-${platform.limits.bodyChars[1]} chars`
              : "No published hard limit"}
          </p>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Promotion</p>
          <p className="mt-2 text-xl font-semibold capitalize">
            {platform.promo.policy.replaceAll("_", " ")}
          </p>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Publishing</p>
          <p className="mt-2 text-xl font-semibold capitalize">{platform.publish.mode}</p>
        </section>
      </div>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">What Wolf can use here</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {supportedCapabilities.map((capability) => (
            <span key={capability} className="rounded-full bg-muted px-3 py-1 text-sm">
              {capability}
            </span>
          ))}
        </div>
      </section>
      <PlatformRulesPanel
        key={activeBrand?.id ?? "no-brand"}
        platform={{
          slug: platform.slug,
          name: platform.name,
          supportsTitle: platform.editor.title,
          supportsSubtitle: platform.editor.subtitle,
        }}
        brandId={activeBrand?.id ?? null}
        brandName={activeBrand?.name ?? null}
        initialGuidance={
          profile ? BrandPlatformGuidanceSchema.parse(profile.guidance) : null
        }
        initialEnabled={profile?.isEnabled ?? true}
      />
    </div>
  );
}
