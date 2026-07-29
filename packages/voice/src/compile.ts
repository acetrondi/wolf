import { createHash } from "node:crypto";

import type { VoiceSample, VoiceSpec } from "./spec";

const AXIS_WORDS = {
  directness: [
    "softens everything",
    "diplomatic",
    "clear",
    "blunt",
    "says the uncomfortable thing",
  ],
  formality: [
    "texting a friend",
    "casual",
    "professional but human",
    "formal",
    "whitepaper",
  ],
  warmth: ["cool", "measured", "warm", "personable", "very personal"],
  technical_depth: ["plain language", "accessible", "technical", "deep", "expert"],
  humour: ["none", "dry and rare", "light", "playful", "comedic"],
  claim_strength: ["heavily hedged", "cautious", "balanced", "confident", "assertive"],
} as const;

function axisPhrase(axis: keyof typeof AXIS_WORDS, value: number): string {
  const words = AXIS_WORDS[axis];
  const idx = Math.min(Math.max(value, 1), 5) - 1;
  return words[idx] ?? words[2];
}

function povLabel(pov: VoiceSpec["persona"]["pov"]): string {
  switch (pov) {
    case "first_singular":
      return "first person singular";
    case "first_plural":
      return "first person plural";
    case "second":
      return "second person";
    default:
      return "neutral";
  }
}

function relationshipLabel(r: VoiceSpec["persona"]["relationship"]): string {
  return r;
}

function sortSamples(samples: VoiceSample[]): VoiceSample[] {
  return [...samples].sort(
    (a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id),
  );
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length / 0.75);
}

export function compileVoiceCard(input: { spec: VoiceSpec; samples: VoiceSample[] }): {
  card: string;
  hash: string;
  tokenEstimate: number;
} {
  const spec = input.spec;
  const good = sortSamples(input.samples.filter((s) => s.label === "good"));
  const bad = sortSamples(input.samples.filter((s) => s.label === "bad"));

  const preferred = [...spec.lexicon.preferred].sort((a, b) => a.localeCompare(b));
  const banned = [...spec.lexicon.banned].sort((a, b) => a.localeCompare(b));
  const credibility = [...spec.persona.credibility].sort((a, b) => a.localeCompare(b));
  const must = [...spec.rules.must].sort((a, b) => a.localeCompare(b));
  const mustNot = [...spec.rules.must_not].sort((a, b) => a.localeCompare(b));
  const forbidden = [...spec.evidence.forbidden_claims].sort((a, b) =>
    a.localeCompare(b),
  );
  const boundaries = [...spec.boundaries.topics].sort((a, b) => a.localeCompare(b));
  const antiVoices = [...spec.boundaries.anti_voices].sort((a, b) => a.localeCompare(b));

  const lines: string[] = [
    "## VOICE",
    "",
    `You are writing as: ${spec.persona.role}. You speak as a ${relationshipLabel(spec.persona.relationship)} to ${spec.positioning.audience}, in ${povLabel(spec.persona.pov)}.`,
    credibility.length
      ? `Credibility anchors: ${credibility.join("; ")}. Reference only when load-bearing.`
      : "",
    "",
    `Positioning spine: ${spec.positioning.spine}`,
    `Intent: ${spec.positioning.intent}.`,
    "",
    `Tone: ${axisPhrase("warmth", spec.axes.warmth)} and ${axisPhrase("directness", spec.axes.directness)}. ${axisPhrase("formality", spec.axes.formality)}. ${axisPhrase("technical_depth", spec.axes.technical_depth)} depth. Humour is ${axisPhrase("humour", spec.axes.humour)}. Claims are ${axisPhrase("claim_strength", spec.axes.claim_strength)}.`,
    "",
    `Rhythm: ~${spec.rhythm.avg_sentence_words} words per sentence, ${spec.rhythm.sentence_variance} variance. Paragraphs up to ${spec.rhythm.paragraph_max_sentences} sentences. Open with ${spec.rhythm.opener_style}. Close with ${spec.rhythm.closer_style}.`,
    "",
    `Language: ${spec.lexicon.spelling} spelling; ${spec.lexicon.language_mix}. Contractions ${spec.lexicon.contractions ? "on" : "off"}. Emoji ${spec.lexicon.emoji}. Profanity ${spec.lexicon.profanity}. Jargon: ${spec.lexicon.jargon_policy}.`,
    preferred.length ? `Prefer: ${preferred.join(", ")}.` : "",
    banned.length ? `Never use: ${banned.join(", ")}.` : "",
    "",
    `Boundaries: do not discuss ${boundaries.join(", ") || "none listed"}. Never sound like: ${antiVoices.join(", ") || "unspecified"}. Public/private distance: ${spec.boundaries.public_private_distance}.`,
    "",
    `Evidence: specifics required = ${spec.evidence.requires_specifics}. Forbidden claims: ${forbidden.join(", ") || "none"}.`,
    "",
    "MUST:",
    ...must.map((r) => `- ${r}`),
    "",
    "MUST NOT:",
    ...mustNot.map((r) => `- ${r}`),
  ];

  if (good.length) {
    lines.push("", "## HOW THIS BRAND SOUNDS");
    for (const sample of good.slice(0, 3)) {
      lines.push(truncateWords(sample.body, 200));
    }
  }

  if (bad.length) {
    lines.push("", "## HOW THIS BRAND DOES NOT SOUND");
    for (const sample of bad.slice(0, 2)) {
      lines.push(truncateWords(sample.body, 120));
    }
  }

  let card = lines
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");

  const maxTokens = 900;
  if (estimateTokens(card) > maxTokens) {
    const words = card.split(/\s+/);
    card = words.slice(0, Math.floor(maxTokens * 0.75)).join(" ");
  }

  const hash = createHash("sha256").update(card).digest("hex");
  return { card, hash, tokenEstimate: estimateTokens(card) };
}
