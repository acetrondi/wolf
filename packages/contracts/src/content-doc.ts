import { z } from "zod";

const ContentMarkSchema = z.enum(["bold", "italic", "code", "link"]);

export const ContentBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    text: z.string().min(1),
    marks: z.array(ContentMarkSchema).default([]),
  }),
  z.object({
    type: z.literal("heading"),
    text: z.string().min(1),
    level: z.union([z.literal(2), z.literal(3)]).default(2),
  }),
  z.object({
    type: z.literal("list"),
    items: z.array(z.string().min(1)).min(1),
    ordered: z.boolean().default(false),
  }),
  z.object({ type: z.literal("quote"), text: z.string().min(1) }),
  z.object({
    type: z.literal("code"),
    text: z.string(),
    language: z.string().max(40).optional(),
  }),
  z.object({
    type: z.literal("cta"),
    text: z.string().min(1),
    href: z.string().url().optional(),
  }),
]);

export const ContentDocSchema = z.object({
  version: z.literal(1),
  title: z.string().max(300).nullable().default(null),
  subtitle: z.string().max(500).nullable().default(null),
  blocks: z.array(ContentBlockSchema).min(1),
  tags: z.array(z.string().min(1).max(80)).max(30).default([]),
  links: z.array(z.string().url()).max(30).default([]),
  imageUrls: z.array(z.string().url()).max(20).default([]),
});

export type ContentDoc = z.infer<typeof ContentDocSchema>;
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export function docStats(doc: ContentDoc): {
  words: number;
  chars: number;
  readingTimeSec: number;
} {
  const text = [
    doc.title ?? "",
    doc.subtitle ?? "",
    ...doc.blocks.flatMap((block) =>
      block.type === "list" ? block.items : "text" in block ? [block.text] : [],
    ),
  ].join(" ");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return {
    words,
    chars: text.length,
    readingTimeSec: Math.max(1, Math.ceil((words / 200) * 60)),
  };
}

export function migrateDoc(input: unknown): ContentDoc {
  return ContentDocSchema.parse(input);
}
