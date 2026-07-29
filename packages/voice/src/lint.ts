import { extractFeatures } from "./features";
import type { ContentDoc, LintFinding, LintReport, VoiceSpec } from "./spec";

type Rule = {
  id: string;
  severity: "warn" | "error";
  test: (ctx: RuleContext) => LintFinding | null;
};

type RuleContext = {
  spec: VoiceSpec;
  block: ContentDoc["blocks"][number];
  blockIndex: number;
  blockText: string;
  docText: string;
};

const SL_AI_VOCAB =
  /\b(delve|leverage|seamless|robust|unlock|elevate|harness|game-changer|revolutionize|in today's fast-paced world)\b/i;

const SL_SIGNIFICANCE =
  /\b(stands as|serves as|is a testament|pivotal moment|evolving landscape|marks a shift)\b/i;

function sentenceContaining(text: string, matchIndex: number): string {
  const start = text.lastIndexOf(".", matchIndex) + 1;
  const end = text.indexOf(".", matchIndex);
  const slice = text.slice(start, end === -1 ? undefined : end + 1).trim();
  return slice.slice(0, 160) || text.slice(0, 160);
}

function bannedTermFinding(ctx: RuleContext): LintFinding | null {
  const lower = ctx.blockText.toLowerCase();
  for (const term of ctx.spec.lexicon.banned) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx >= 0) {
      return {
        rule: "VL-001",
        severity: "error",
        blockIndex: ctx.blockIndex,
        quote: sentenceContaining(ctx.blockText, idx),
        message: `Banned term "${term}"`,
      };
    }
  }
  return null;
}

function povFinding(ctx: RuleContext): LintFinding | null {
  if (ctx.block.type === "code") return null;
  const hasWe = /\b(we|we're|our)\b/i.test(ctx.blockText);
  const hasI = /\b(I|I'm|my)\b/.test(ctx.blockText);
  if (ctx.spec.persona.pov === "first_singular" && hasWe) {
    return {
      rule: "VL-007",
      severity: "error",
      blockIndex: ctx.blockIndex,
      quote: ctx.blockText.slice(0, 160),
      message: "POV mismatch: spec uses I, text uses we",
    };
  }
  if (ctx.spec.persona.pov === "first_plural" && hasI && !hasWe) {
    return {
      rule: "VL-007",
      severity: "error",
      blockIndex: ctx.blockIndex,
      quote: ctx.blockText.slice(0, 160),
      message: "POV mismatch: spec uses we, text uses I",
    };
  }
  return null;
}

function sl008Finding(ctx: RuleContext): LintFinding | null {
  const match = SL_AI_VOCAB.exec(ctx.blockText);
  if (!match || match.index === undefined) return null;
  return {
    rule: "SL-008",
    severity: "error",
    blockIndex: ctx.blockIndex,
    quote: sentenceContaining(ctx.blockText, match.index),
    message: `AI vocabulary: "${match[0]}"`,
  };
}

function sl001Finding(ctx: RuleContext): LintFinding | null {
  const match = SL_SIGNIFICANCE.exec(ctx.blockText);
  if (!match || match.index === undefined) return null;
  return {
    rule: "SL-001",
    severity: "error",
    blockIndex: ctx.blockIndex,
    quote: sentenceContaining(ctx.blockText, match.index),
    message: `Significance inflation: "${match[0]}"`,
  };
}

function rhythmFinding(ctx: RuleContext): LintFinding | null {
  if (ctx.block.type === "code") return null;
  const features = extractFeatures(ctx.blockText);
  const target = ctx.spec.rhythm.avg_sentence_words;
  const delta = Math.abs(features.avgSentenceWords - target) / target;
  if (delta > 0.35) {
    return {
      rule: "VL-003",
      severity: "warn",
      blockIndex: ctx.blockIndex,
      quote: ctx.blockText.slice(0, 160),
      message: `Avg sentence length ${features.avgSentenceWords.toFixed(1)} vs target ${target}`,
    };
  }
  return null;
}

const RULES: Rule[] = [
  { id: "VL-001", severity: "error", test: bannedTermFinding },
  { id: "VL-003", severity: "warn", test: rhythmFinding },
  { id: "VL-007", severity: "error", test: povFinding },
  { id: "SL-001", severity: "error", test: sl001Finding },
  { id: "SL-008", severity: "error", test: sl008Finding },
];

export function lintVoice(
  doc: ContentDoc,
  opts: {
    spec: VoiceSpec;
    severityOverrides?: Record<string, "off" | "warn" | "error">;
  },
): LintReport {
  const findings: LintFinding[] = [];
  const docText = doc.blocks.map((b) => b.text).join("\n\n");

  for (let blockIndex = 0; blockIndex < doc.blocks.length; blockIndex++) {
    const block = doc.blocks[blockIndex];
    if (!block || block.type === "code") continue;

    const ctx: RuleContext = {
      spec: opts.spec,
      block,
      blockIndex,
      blockText: block.text,
      docText,
    };

    for (const rule of RULES) {
      const override = opts.severityOverrides?.[rule.id];
      if (override === "off") continue;
      const finding = rule.test(ctx);
      if (!finding) continue;
      findings.push({
        ...finding,
        severity: override ?? finding.severity,
      });
    }
  }

  return {
    findings,
    errorCount: findings.filter((f) => f.severity === "error").length,
    warnCount: findings.filter((f) => f.severity === "warn").length,
  };
}
