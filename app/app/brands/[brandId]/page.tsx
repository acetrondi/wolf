import { withTenant } from "@wolf/db";
import Link from "next/link";
import { notFound } from "next/navigation";

import { resolveTenantContext } from "@/lib/tenant/resolve-tenant-context";

type PageProps = {
  params: Promise<{ brandId: string }>;
};

export default async function BrandPage({ params }: PageProps) {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return null;

  const { brandId } = await params;
  const data = await withTenant(ctx.value, async (tx) => {
    const brand = await tx<{ name: string; slug: string }[]>`
      select name, slug::text from brand
      where id = ${brandId}::uuid and deleted_at is null
      limit 1
    `;
    if (!brand[0]) return null;
    const voice = await tx<
      {
        version: number;
        cardHash: string;
        compiledCard: string;
        confidence: string | null;
      }[]
    >`
      select
        version,
        card_hash as "cardHash",
        compiled_card as "compiledCard",
        spec->'meta'->>'confidence' as confidence
      from brand_voice
      where brand_id = ${brandId}::uuid and is_active = true
      limit 1
    `;
    return { brand: brand[0], voice: voice[0] ?? null };
  });

  if (!data) notFound();

  if (!data.voice) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{data.brand.name}</h1>
        <p className="text-muted-foreground">Voice not set up yet.</p>
        <Link className="underline" href={`/app/brands/${brandId}/platforms`}>
          Set platform preferences
        </Link>
        <Link className="underline" href={`/app/brands/${brandId}/voice/onboarding`}>
          Set up voice
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.brand.name}</h1>
        <p className="text-sm text-muted-foreground">
          Voice v{data.voice.version} Â· {data.voice.confidence ?? "unknown"} confidence
          Â· <span className="font-mono">{data.voice.cardHash.slice(0, 12)}â€¦</span>
        </p>
      </div>
      <Link className="text-sm underline" href={`/app/brands/${brandId}/platforms`}>
        Set platform preferences
      </Link>
      <pre className="overflow-auto rounded-xl border border-border bg-muted p-4 text-xs whitespace-pre-wrap">
        {data.voice.compiledCard}
      </pre>
    </div>
  );
}
