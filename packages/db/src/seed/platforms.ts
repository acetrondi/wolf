import { createHash } from "node:crypto";

import { withSystem } from "../tenant";

type PlatformSeed = {
  slug: string;
  name: string;
  kind: string;
};

const PLATFORMS: PlatformSeed[] = [
  { slug: "medium", name: "Medium", kind: "longform" },
  { slug: "devto", name: "Dev.to", kind: "longform" },
  { slug: "hashnode", name: "Hashnode", kind: "longform" },
  { slug: "substack", name: "Substack", kind: "newsletter" },
  { slug: "reddit", name: "Reddit", kind: "community" },
  { slug: "indiehackers", name: "Indie Hackers", kind: "community" },
  { slug: "linkedin", name: "LinkedIn", kind: "microblog" },
  { slug: "x", name: "X", kind: "microblog" },
  { slug: "threads", name: "Threads", kind: "microblog" },
  { slug: "instagram", name: "Instagram", kind: "visual" },
  { slug: "newsletter", name: "Newsletter", kind: "newsletter" },
];

function configFor(p: PlatformSeed) {
  return {
    slug: p.slug,
    name: p.name,
    kind: p.kind,
    limits: {
      titleChars: [20, 100],
      bodyChars: [100, 20000],
      tagsMax: 5,
      tagFormat: "plain",
      linksMax: null,
      imagesMax: 10,
    },
    supports: {
      headings: true,
      codeBlocks: true,
      inlineFormatting: true,
      lists: true,
      quotes: true,
      canonicalUrl: true,
      coverImage: true,
      markdown: true,
    },
    structure: {
      blueprint: ["hook", "body", "takeaway"],
      openerStyles: ["story", "claim"],
      closerStyles: ["summary", "cta"],
      idealWords: [400, 1200],
    },
    headline: {
      medianWords: 8,
      medianChars: 55,
      prefer: ["number", "firsthand"],
      avoid: ["ultimate", "game-changer"],
      note: "Seed stub — replace with measured config in Phase 4.",
    },
    voiceDeltas: {
      formality: 0,
      technical_depth: 0,
      directness: 0,
      claim_strength: 0,
    },
    promo: {
      policy: "soft",
      ctaAllowed: true,
      ctaPosition: "end",
      selfLinkRatio: null,
      notes: "",
    },
    lintOverrides: {},
    publish: {
      mode: "export",
      apiNotes: "v1 draft-and-export",
      exportFormats: ["markdown"],
    },
  };
}

function hashConfig(config: unknown): string {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}

/** Idempotent platform upsert. Bumps config_version only when config JSON changes. */
export async function seedPlatforms(): Promise<number> {
  return withSystem("seed platforms registry", async (tx) => {
    let touched = 0;
    for (const p of PLATFORMS) {
      const config = configFor(p);
      const nextHash = hashConfig(config);
      const existing = await tx<
        {
          id: string;
          config: unknown;
          config_version: number;
        }[]
      >`
        select id, config, config_version
        from platform
        where slug = ${p.slug}
        limit 1
      `;

      const row = existing[0];
      if (!row) {
        await tx`
          insert into platform (slug, name, config, config_version)
          values (${p.slug}, ${p.name}, ${tx.json(config)}, 1)
        `;
        touched += 1;
        continue;
      }

      const prevHash = hashConfig(row.config);
      if (prevHash === nextHash) continue;

      await tx`
        update platform
        set
          name = ${p.name},
          config = ${tx.json(config)},
          config_version = ${row.config_version + 1}
        where slug = ${p.slug}
      `;
      touched += 1;
    }
    return touched;
  });
}

export { PLATFORMS };
