import { z } from "zod";

const CharRangeSchema = z.tuple([
  z.number().int().nonnegative(),
  z.number().int().positive(),
]);

export const PlatformConfigSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9_]*$/),
  name: z.string().min(1),
  kind: z.enum(["longform", "microblog", "community", "newsletter", "visual"]),
  limits: z.object({
    titleChars: CharRangeSchema.nullable(),
    bodyChars: CharRangeSchema.nullable(),
    tagsMax: z.number().int().nonnegative().nullable(),
    tagFormat: z.enum(["plain", "hashtag", "none"]),
    linksMax: z.number().int().nonnegative().nullable(),
    imagesMax: z.number().int().nonnegative().nullable(),
  }),
  supports: z.object({
    headings: z.boolean(),
    codeBlocks: z.boolean(),
    inlineFormatting: z.boolean(),
    lists: z.boolean(),
    quotes: z.boolean(),
    canonicalUrl: z.boolean(),
    coverImage: z.boolean(),
    markdown: z.boolean(),
  }),
  editor: z.object({
    title: z.boolean().default(false),
    subtitle: z.boolean(),
    embeds: z.boolean(),
    altText: z.boolean(),
    notes: z.array(z.string()),
  }),
  media: z.object({
    formats: z.array(z.string()),
    recommendedDimensions: z.array(z.string()),
    maxBytes: z.number().int().positive().nullable(),
    notes: z.array(z.string()),
  }),
  structure: z.object({
    blueprint: z.array(z.string()).min(1),
    openerStyles: z.array(z.string()).min(1),
    closerStyles: z.array(z.string()).min(1),
    idealWords: CharRangeSchema,
  }),
  headline: z.object({
    medianWords: z.number().nonnegative(),
    medianChars: z.number().nonnegative(),
    prefer: z.array(z.string()),
    avoid: z.array(z.string()),
    note: z.string(),
  }),
  voiceDeltas: z.object({
    formality: z.number().int().min(-2).max(2),
    technical_depth: z.number().int().min(-2).max(2),
    directness: z.number().int().min(-2).max(2),
    claim_strength: z.number().int().min(-2).max(2),
  }),
  promo: z.object({
    policy: z.enum(["free", "soft", "restricted", "banned_in_body"]),
    ctaAllowed: z.boolean(),
    ctaPosition: z.enum(["end", "none"]),
    selfLinkRatio: z.number().positive().nullable(),
    notes: z.string(),
  }),
  lintOverrides: z.record(z.string(), z.enum(["off", "warn", "error"])).default({}),
  publish: z.object({
    mode: z.enum(["api", "export", "assisted"]),
    apiNotes: z.string(),
    exportFormats: z.array(z.enum(["markdown", "html", "plaintext", "richtext"])).min(1),
  }),
});

export type PlatformConfig = z.infer<typeof PlatformConfigSchema>;
