import { compileVoiceCard } from "./compile";
import { aggregateFeatures, extractFeatures } from "./features";
import type { VoiceOnboardingDecisions, VoiceSample, VoiceSpec } from "./spec";
import { VoiceSpecSchema } from "./spec";

const DEFAULT_BANNED = [
  "leverage",
  "seamless",
  "delve",
  "unlock",
  "game-changer",
  "robust",
  "journey",
  "elevate",
  "cutting-edge",
  "in today's fast-paced world",
];

export function voiceConfidence(sampleCount: number): "high" | "partial" | "low" {
  if (sampleCount >= 3) return "high";
  if (sampleCount >= 1) return "partial";
  return "low";
}

export function voiceProvenance(
  sampleCount: number,
  hasDecisions: boolean,
): "samples" | "decisions" | "hybrid" {
  if (sampleCount > 0 && hasDecisions) return "hybrid";
  if (sampleCount > 0) return "samples";
  return "decisions";
}

function intentToRelationship(
  intent: VoiceOnboardingDecisions["intent"],
): VoiceSpec["persona"]["relationship"] {
  switch (intent) {
    case "hire":
      return "teacher";
    case "respect":
      return "analyst";
    case "education":
      return "practitioner";
    default:
      return "peer";
  }
}

function formatToRhythm(format: VoiceOnboardingDecisions["formatPreference"]) {
  switch (format) {
    case "long_story":
      return {
        avg_sentence_words: 18,
        sentence_variance: "high" as const,
        paragraph_max_sentences: 4,
        opener_style: "story" as const,
        closer_style: "takeaway" as const,
      };
    case "short_claim":
      return {
        avg_sentence_words: 12,
        sentence_variance: "low" as const,
        paragraph_max_sentences: 2,
        opener_style: "claim" as const,
        closer_style: "cta" as const,
      };
    default:
      return {
        avg_sentence_words: 14,
        sentence_variance: "medium" as const,
        paragraph_max_sentences: 3,
        opener_style: "claim" as const,
        closer_style: "understatement" as const,
      };
  }
}

function featuresToAxes(features: NonNullable<ReturnType<typeof aggregateFeatures>>) {
  const directness =
    features.hedgeDensity < 0.02 ? 5 : features.hedgeDensity < 0.04 ? 4 : 3;
  const formality =
    features.contractionRate > 0.08 ? 2 : features.contractionRate > 0.04 ? 3 : 4;
  return {
    formality,
    warmth: 3,
    directness,
    technical_depth: features.readingEase < 50 ? 4 : 3,
    humour: 2,
    claim_strength: directness >= 4 ? 4 : 3,
  };
}

export function proposeVoiceSpec(input: {
  brandName: string;
  decisions: VoiceOnboardingDecisions;
  samples: VoiceSample[];
}): { spec: VoiceSpec; justifications: Record<string, string> } {
  const agg = aggregateFeatures(input.samples);
  const performed = input.samples.filter((s) => s.curatorTag === "performed");
  const liked = input.samples.filter((s) => s.curatorTag === "liked");
  const gap =
    performed.length && liked.length
      ? aggregateFeatures(performed) && aggregateFeatures(liked)
        ? {
            hedgeDelta:
              (aggregateFeatures(liked)?.hedgeDensity ?? 0) -
              (aggregateFeatures(performed)?.hedgeDensity ?? 0),
          }
        : null
      : null;

  const rhythm = agg
    ? {
        avg_sentence_words: Math.round(Math.min(30, Math.max(6, agg.avgSentenceWords))),
        sentence_variance:
          agg.sentenceVariance > 25
            ? ("high" as const)
            : agg.sentenceVariance > 10
              ? ("medium" as const)
              : ("low" as const),
        paragraph_max_sentences: Math.min(
          6,
          Math.max(1, Math.round(agg.avgParagraphSentences) || 3),
        ),
        opener_style: formatToRhythm(input.decisions.formatPreference).opener_style,
        closer_style: formatToRhythm(input.decisions.formatPreference).closer_style,
      }
    : formatToRhythm(input.decisions.formatPreference);

  const axes = agg
    ? featuresToAxes(agg)
    : {
        formality: input.decisions.publicPrivateDistance === "zero" ? 2 : 3,
        warmth: 3,
        directness: input.decisions.competitorWontSay ? 5 : 4,
        technical_depth: 3,
        humour: 2,
        claim_strength: input.decisions.competitorWontSay ? 4 : 3,
      };

  const credibility: string[] = [];
  if (input.decisions.expensiveMistake)
    credibility.push(input.decisions.expensiveMistake);
  if (input.decisions.uniqueAccess) credibility.push(input.decisions.uniqueAccess);

  const antiBanned = [
    ...DEFAULT_BANNED,
    ...input.decisions.antiVoices.flatMap((v) => [`sounds like ${v.toLowerCase()}`]),
  ];

  const must: string[] = [
    "Name the tradeoff of any recommendation.",
    input.decisions.competitorWontSay
      ? `Say plainly what others won't: ${input.decisions.competitorWontSay}`
      : "State the uncomfortable truth when it matters.",
  ];
  if (input.decisions.contrarianBelief) {
    must.push(`Return to this belief when relevant: ${input.decisions.contrarianBelief}`);
  }

  const mustNot: string[] = [
    ...input.decisions.offLimits.map((t) => `Mention or imply: ${t}`),
    ...input.decisions.antiVoices.map((v) => `Sound like ${v}`),
    "Open with a rhetorical question.",
    "End on a generic upbeat note.",
  ];

  const goodIds = input.samples
    .filter((s) => s.label === "good")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => s.id)
    .slice(0, 6);
  const badIds = input.samples
    .filter((s) => s.label === "bad")
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => s.id)
    .slice(0, 4);

  const sampleCount = input.samples.length;
  const spec = VoiceSpecSchema.parse({
    version: 1,
    positioning: {
      audience: input.decisions.audience,
      intent: input.decisions.intent,
      spine: input.decisions.contrarianBelief,
    },
    persona: {
      pov: input.decisions.pov,
      role: `voice of ${input.brandName}`,
      credibility: credibility.slice(0, 5),
      relationship: intentToRelationship(input.decisions.intent),
    },
    axes,
    rhythm,
    lexicon: {
      preferred: ["shipped", "measured", "actually", "the tradeoff"],
      banned: [...new Set(antiBanned)].sort((a, b) => a.localeCompare(b)),
      spelling: "en_in",
      jargon_policy: "explain_on_first_use",
      emoji: agg && agg.emojiCount > 0.5 ? "sparingly" : "never",
      contractions: agg ? agg.contractionRate > 0.03 : true,
      profanity: input.decisions.profanity,
      language_mix: input.decisions.languageMix,
    },
    boundaries: {
      topics: input.decisions.offLimits,
      anti_voices: input.decisions.antiVoices,
      public_private_distance: input.decisions.publicPrivateDistance,
    },
    evidence: {
      requires_specifics: true,
      allowed_proof: ["metric", "personal_experience", "case_study"],
      forbidden_claims: input.decisions.offLimits,
      disclosure: null,
    },
    rules: { must, must_not: mustNot },
    exemplars: { good_sample_ids: goodIds, bad_sample_ids: badIds },
    meta: {
      provenance: voiceProvenance(sampleCount, true),
      confidence: voiceConfidence(sampleCount),
    },
  });

  const justifications: Record<string, string> = {
    "axes.directness": agg
      ? `Hedge density across samples ≈ ${(agg.hedgeDensity * 100).toFixed(1)}%`
      : "Inferred from your risk/decisions answers (no samples yet).",
    "positioning.spine": "Taken from your contrarian belief.",
    "lexicon.banned": input.decisions.antiVoices.length
      ? `Anti-voices: ${input.decisions.antiVoices.join(", ")}`
      : "Default AI-slop blocklist.",
  };
  if (gap) {
    justifications["axes.directness"] +=
      ` Performed vs liked hedge delta: ${(gap.hedgeDelta * 100).toFixed(1)}%.`;
  }

  return { spec, justifications };
}

export function compileBrandVoice(input: { spec: VoiceSpec; samples: VoiceSample[] }) {
  return compileVoiceCard(input);
}

export function sampleFromText(
  id: string,
  body: string,
  label: "good" | "bad" = "good",
): VoiceSample {
  return { id, label, body, curatorTag: null };
}

export { extractFeatures };
