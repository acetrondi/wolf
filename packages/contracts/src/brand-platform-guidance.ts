import { z } from "zod";

const guidanceLine = z.string().trim().min(1).max(500);
const TiptapMarkSchema = z
  .object({
    type: z.string().min(1),
    attrs: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();
const TiptapNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      text: z.string().max(10_000).optional(),
      attrs: z.record(z.string(), z.unknown()).nullable().optional(),
      marks: z.array(TiptapMarkSchema).max(50).optional(),
      content: z.array(TiptapNodeSchema).max(200).optional(),
    })
    .passthrough(),
);

export const BrandPlatformGuidanceSchema = z.object({
  openingGuidance: guidanceLine.nullable().default(null),
  closingGuidance: guidanceLine.nullable().default(null),
  headlineGuidance: guidanceLine.nullable().default(null),
  requiredElements: z.array(guidanceLine).max(10).default([]),
  avoidElements: z.array(guidanceLine).max(10).default([]),
  customRules: z.array(guidanceLine).max(15).default([]),
  writingRules: z
    .object({ type: z.literal("doc"), content: z.array(TiptapNodeSchema).max(200) })
    .passthrough()
    .nullable()
    .default(null),
});

export type BrandPlatformGuidance = z.infer<typeof BrandPlatformGuidanceSchema>;
