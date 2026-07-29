"use server";

import type { AppError } from "@wolf/contracts";
import { err, ok, type Result } from "@wolf/contracts";
import { authorize } from "@wolf/core";
import { withTenant } from "@wolf/db";
import {
  compileBrandVoice,
  type VoiceOnboardingDecisions as Decisions,
  proposeVoiceSpec,
  VoiceOnboardingDecisionsSchema,
  type VoiceSample,
  VoiceSpecSchema,
} from "@wolf/voice";
import { revalidatePath } from "next/cache";
import { resolveTenantContext } from "@/lib/tenant/resolve-tenant-context";
import { enhanceVoiceProposal } from "@/lib/voice/enhance-proposal";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "brand"
  );
}

export async function listBrands(): Promise<
  Result<{ id: string; name: string; slug: string; hasVoice: boolean }[], AppError>
> {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return ctx;

  const rows = await withTenant(ctx.value, async (tx) => {
    return tx<{ id: string; name: string; slug: string; hasVoice: boolean }[]>`
      select
        b.id::text,
        b.name,
        b.slug::text,
        exists (
          select 1 from brand_voice bv
          where bv.brand_id = b.id and bv.is_active = true
        ) as "hasVoice"
      from brand b
      where b.deleted_at is null
      order by b.name asc
    `;
  });

  return ok(rows);
}

export async function createBrand(
  name: string,
): Promise<Result<{ id: string }, AppError>> {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return ctx;

  const allowed = authorize(ctx.value, "brand:write");
  if (!allowed.ok) return allowed;

  const baseSlug = slugify(name);
  const brand = await withTenant(ctx.value, async (tx) => {
    let slug = baseSlug;
    let n = 0;
    while (true) {
      const clash = await tx<{ id: string }[]>`
        select id::text from brand where org_id = ${ctx.value.orgId} and slug = ${slug} limit 1
      `;
      if (!clash.length) break;
      n += 1;
      slug = `${baseSlug}-${n}`;
    }
    const rows = await tx<{ id: string }[]>`
      insert into brand (org_id, name, slug)
      values (${ctx.value.orgId}, ${name}, ${slug})
      returning id::text
    `;
    const row = rows[0];
    if (!row) throw new Error("brand insert failed");
    return row;
  });

  revalidatePath("/app/brands");
  return ok(brand);
}

export type OnboardingSampleInput = {
  body: string;
  label: "good" | "bad";
  curatorTag?: "performed" | "liked" | "deleted" | "annoyed" | null;
  notes?: string;
};

export async function proposeBrandVoice(input: {
  brandId: string;
  brandName: string;
  decisions: Decisions;
  samples: OnboardingSampleInput[];
}): Promise<
  Result<
    {
      spec: unknown;
      justifications: Record<string, string>;
      confidence: string;
    },
    AppError
  >
> {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return ctx;

  const parsed = VoiceOnboardingDecisionsSchema.safeParse(input.decisions);
  if (!parsed.success) {
    return err({ kind: "validation", message: "Invalid onboarding answers" });
  }

  const draft = proposeVoiceSpec({
    brandName: input.brandName,
    decisions: parsed.data,
    samples: input.samples.map((s, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      label: s.label,
      body: s.body,
      curatorTag: s.curatorTag ?? null,
    })),
  });

  const enhanced = await enhanceVoiceProposal({
    draft: draft.spec,
    justifications: draft.justifications,
    samples: input.samples,
    decisions: parsed.data,
  });

  return ok({
    spec: enhanced.spec,
    justifications: enhanced.justifications,
    confidence: enhanced.spec.meta?.confidence ?? "low",
  });
}

export async function saveBrandVoice(input: {
  brandId: string;
  spec: unknown;
  samples: OnboardingSampleInput[];
}): Promise<Result<{ version: number; cardHash: string }, AppError>> {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return ctx;

  const allowed = authorize(ctx.value, "brand:write");
  if (!allowed.ok) return allowed;

  const spec = VoiceSpecSchema.safeParse(input.spec);
  if (!spec.success) {
    return err({ kind: "validation", message: "Invalid voice spec" });
  }

  const saved = await withTenant(ctx.value, async (tx) => {
    const brand = await tx<{ id: string; name: string }[]>`
      select id::text, name from brand
      where id = ${input.brandId}::uuid and deleted_at is null
      limit 1
    `;
    if (!brand[0]) throw new Error("brand not found");

    for (const sample of input.samples) {
      await tx`
        insert into brand_voice_sample (org_id, brand_id, label, curator_tag, body, notes)
        values (
          ${ctx.value.orgId},
          ${input.brandId}::uuid,
          ${sample.label},
          ${sample.curatorTag ?? null},
          ${sample.body},
          ${sample.notes ?? null}
        )
      `;
    }

    const sampleRows = await tx<
      { id: string; label: string; body: string; curatorTag: string | null }[]
    >`
      select id::text, label, body, curator_tag as "curatorTag"
      from brand_voice_sample
      where brand_id = ${input.brandId}::uuid
      order by created_at asc
    `;

    const voiceSamples: VoiceSample[] = sampleRows.map((s) => {
      const sample: VoiceSample = {
        id: s.id,
        label: s.label as "good" | "bad",
        body: s.body,
      };
      if (s.curatorTag) {
        sample.curatorTag = s.curatorTag as NonNullable<VoiceSample["curatorTag"]>;
      }
      return sample;
    });

    const goodIds = voiceSamples.filter((s) => s.label === "good").map((s) => s.id);
    const badIds = voiceSamples.filter((s) => s.label === "bad").map((s) => s.id);
    const specWithExemplars = VoiceSpecSchema.parse({
      ...spec.data,
      exemplars: {
        good_sample_ids: goodIds.slice(0, 6),
        bad_sample_ids: badIds.slice(0, 4),
      },
    });

    const compiled = compileBrandVoice({
      spec: specWithExemplars,
      samples: voiceSamples,
    });

    const versionRows = await tx<{ v: number }[]>`
      select coalesce(max(version), 0) + 1 as v
      from brand_voice where brand_id = ${input.brandId}::uuid
    `;
    const version = versionRows[0]?.v ?? 1;

    await tx`
      update brand_voice set is_active = false
      where brand_id = ${input.brandId}::uuid and is_active = true
    `;

    await tx`
      insert into brand_voice (
        org_id, brand_id, version, is_active, spec, compiled_card, card_hash, created_by
      )
      values (
        ${ctx.value.orgId},
        ${input.brandId}::uuid,
        ${version},
        true,
        ${tx.json(specWithExemplars)},
        ${compiled.card},
        ${compiled.hash},
        ${ctx.value.userId}
      )
    `;

    return { version, cardHash: compiled.hash };
  });

  revalidatePath(`/app/brands/${input.brandId}`);
  revalidatePath("/app/brands");
  return ok(saved);
}
