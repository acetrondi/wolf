"use server";

import {
  type AppError,
  BrandPlatformGuidanceSchema,
  err,
  normalizeJson,
  ok,
  type Result,
} from "@wolf/contracts";
import { authorize } from "@wolf/core";
import { withTenant } from "@wolf/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resolveTenantContext } from "@/lib/tenant/resolve-tenant-context";

const CopyRulesInputSchema = z.object({
  brandId: z.string().uuid(),
  sourcePlatformSlug: z.string().regex(/^[a-z][a-z0-9-]*$/),
});

export async function saveBrandPlatformGuidance(input: {
  brandId: string;
  platformSlug: string;
  isEnabled: boolean;
  guidance: unknown;
}): Promise<Result<{ missingPlatformCount: number }, AppError>> {
  const ctx = await resolveTenantContext();
  if (!ctx.ok) return ctx;
  const allowed = authorize(ctx.value, "brand:write");
  if (!allowed.ok) return allowed;
  const guidance = BrandPlatformGuidanceSchema.safeParse(normalizeJson(input.guidance));
  if (!guidance.success) {
    const issue = guidance.error.issues[0];
    const field = issue?.path.length ? issue.path.join(".") : "writing rules";
    console.error("Invalid brand platform guidance", {
      field,
      message: issue?.message,
    });
    return err({
      kind: "validation",
      message: `Check ${field}: ${issue?.message ?? "invalid value"}.`,
    });
  }

  const saved = await withTenant(ctx.value, async (tx): Promise<number | null> => {
    const rows = await tx<{ platformId: string }[]>`
      select p.id::text as "platformId"
      from platform p join brand b on b.id = ${input.brandId}::uuid
      where p.slug = ${input.platformSlug} and b.deleted_at is null
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    await tx`
      insert into brand_platform_profile (org_id, brand_id, platform_id, content_guidance, is_enabled)
      values (${ctx.value.orgId}, ${input.brandId}::uuid, ${row.platformId}::uuid, ${tx.json(JSON.parse(JSON.stringify(guidance.data)))}, ${input.isEnabled})
      on conflict (brand_id, platform_id) do update
      set content_guidance = excluded.content_guidance, is_enabled = excluded.is_enabled, updated_at = now()
    `;
    const missingRows = await tx<{ count: number }[]>`
      select count(*)::int as count
      from platform p
      left join brand_platform_profile bpp
        on bpp.platform_id = p.id
        and bpp.brand_id = ${input.brandId}::uuid
      where p.slug <> ${input.platformSlug}
        and (
          bpp.id is null
          or bpp.content_guidance -> 'writingRules' is null
          or bpp.content_guidance -> 'writingRules' = 'null'::jsonb
        )
    `;
    return missingRows[0]?.count ?? 0;
  });
  if (saved === null) return err({ kind: "not_found", resource: "brand or platform" });
  revalidatePath(`/app/brands/${input.brandId}/platforms`);
  revalidatePath(`/app/platforms/${input.platformSlug}`);
  return ok({ missingPlatformCount: saved });
}

export async function copyBrandPlatformRulesToMissingPlatforms(input: {
  brandId: string;
  sourcePlatformSlug: string;
}): Promise<Result<{ copiedPlatformCount: number }, AppError>> {
  const parsedInput = CopyRulesInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return err({ kind: "validation", message: "Choose a valid brand and platform." });
  }

  const ctx = await resolveTenantContext();
  if (!ctx.ok) return ctx;
  const allowed = authorize(ctx.value, "brand:write");
  if (!allowed.ok) return allowed;

  const copiedPlatformCount = await withTenant(
    ctx.value,
    async (tx): Promise<number | null> => {
      const sourceRows = await tx<{ guidance: unknown }[]>`
        select bpp.content_guidance as guidance
        from brand_platform_profile bpp
        join platform p on p.id = bpp.platform_id
        join brand b on b.id = bpp.brand_id
        where bpp.brand_id = ${parsedInput.data.brandId}::uuid
          and p.slug = ${parsedInput.data.sourcePlatformSlug}
          and b.deleted_at is null
        limit 1
      `;
      const sourceGuidance = BrandPlatformGuidanceSchema.safeParse(
        sourceRows[0]?.guidance,
      );
      if (!sourceGuidance.success || !sourceGuidance.data.writingRules) return null;

      const targetRows = await tx<{ platformId: string }[]>`
        select p.id::text as "platformId"
        from platform p
        left join brand_platform_profile bpp
          on bpp.platform_id = p.id
          and bpp.brand_id = ${parsedInput.data.brandId}::uuid
        where p.slug <> ${parsedInput.data.sourcePlatformSlug}
          and (
            bpp.id is null
            or bpp.content_guidance -> 'writingRules' is null
            or bpp.content_guidance -> 'writingRules' = 'null'::jsonb
          )
      `;
      const copiedGuidance = {
        writingRules: sourceGuidance.data.writingRules,
      };

      for (const target of targetRows) {
        await tx`
          insert into brand_platform_profile (
            org_id,
            brand_id,
            platform_id,
            content_guidance,
            is_enabled
          )
          values (
            ${ctx.value.orgId},
            ${parsedInput.data.brandId}::uuid,
            ${target.platformId}::uuid,
            ${tx.json(JSON.parse(JSON.stringify(copiedGuidance)))},
            true
          )
          on conflict (brand_id, platform_id) do update
          set content_guidance = jsonb_set(
            brand_platform_profile.content_guidance,
            '{writingRules}',
            excluded.content_guidance -> 'writingRules',
            true
          ),
          updated_at = now()
        `;
      }

      return targetRows.length;
    },
  );

  if (copiedPlatformCount === null) {
    return err({ kind: "not_found", resource: "source platform rules" });
  }
  revalidatePath(`/app/brands/${parsedInput.data.brandId}/platforms`);
  revalidatePath("/app/platforms/[platformSlug]", "page");
  return ok({ copiedPlatformCount });
}
