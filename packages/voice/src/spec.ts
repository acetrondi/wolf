import { z } from "zod";

export const VOICE_INTENTS = [
  "inbound",
  "respect",
  "hire",
  "education",
  "other",
] as const;

export const VoiceOnboardingDecisionsSchema = z.object({
  audience: z.string().max(500),
  intent: z.enum(VOICE_INTENTS),
  competitorWontSay: z.string().max(1000).optional(),
  offLimits: z.array(z.string().max(120)).max(20).default([]),
  antiVoices: z.array(z.string().max(120)).max(5).default([]),
  publicPrivateDistance: z.enum(["zero", "professional_layer", "highly_curated"]),
  languageMix: z.enum(["en_only", "hinglish", "audience_dependent"]),
  profanity: z.enum(["never", "mild_ok"]),
  pov: z.enum(["first_singular", "first_plural", "second"]),
  formatPreference: z.enum(["long_story", "short_claim", "balanced"]),
  contrarianBelief: z.string().max(500),
  expensiveMistake: z.string().max(500).optional(),
  uniqueAccess: z.string().max(500).optional(),
});

export type VoiceOnboardingDecisions = z.infer<typeof VoiceOnboardingDecisionsSchema>;

export const VoiceSpecSchema = z.object({
  version: z.literal(1),

  positioning: z.object({
    audience: z.string().max(500),
    intent: z.enum(VOICE_INTENTS),
    spine: z.string().max(500),
  }),

  persona: z.object({
    pov: z.enum(["first_singular", "first_plural", "second", "neutral"]),
    role: z.string().max(120),
    credibility: z.array(z.string().max(200)).max(5),
    relationship: z.enum(["peer", "teacher", "practitioner", "analyst"]),
  }),

  axes: z.object({
    formality: z.number().int().min(1).max(5),
    warmth: z.number().int().min(1).max(5),
    directness: z.number().int().min(1).max(5),
    technical_depth: z.number().int().min(1).max(5),
    humour: z.number().int().min(1).max(5),
    claim_strength: z.number().int().min(1).max(5),
  }),

  rhythm: z.object({
    avg_sentence_words: z.number().int().min(6).max(30),
    sentence_variance: z.enum(["low", "medium", "high"]),
    paragraph_max_sentences: z.number().int().min(1).max(6),
    opener_style: z.enum(["claim", "story", "number", "question", "observation"]),
    closer_style: z.enum(["takeaway", "question", "cta", "understatement", "none"]),
  }),

  lexicon: z.object({
    preferred: z.array(z.string()).max(40),
    banned: z.array(z.string()).max(80),
    spelling: z.enum(["en_us", "en_gb", "en_in"]),
    jargon_policy: z.enum(["explain_on_first_use", "assume_known", "avoid"]),
    emoji: z.enum(["never", "sparingly", "freely"]),
    contractions: z.boolean(),
    profanity: z.enum(["never", "mild_ok"]),
    language_mix: z.enum(["en_only", "hinglish", "audience_dependent"]),
  }),

  boundaries: z.object({
    topics: z.array(z.string().max(120)).max(20),
    anti_voices: z.array(z.string().max(120)).max(5),
    public_private_distance: z.enum(["zero", "professional_layer", "highly_curated"]),
  }),

  evidence: z.object({
    requires_specifics: z.boolean(),
    allowed_proof: z.array(
      z.enum(["metric", "case_study", "personal_experience", "citation", "screenshot"]),
    ),
    forbidden_claims: z.array(z.string()).max(20),
    disclosure: z.string().nullable(),
  }),

  rules: z.object({
    must: z.array(z.string()).max(15),
    must_not: z.array(z.string()).max(15),
  }),

  exemplars: z.object({
    good_sample_ids: z.array(z.string().uuid()).max(6),
    bad_sample_ids: z.array(z.string().uuid()).max(4),
  }),

  meta: z
    .object({
      provenance: z.enum(["samples", "decisions", "hybrid"]),
      confidence: z.enum(["high", "partial", "low"]),
    })
    .optional(),
});

export type VoiceSpec = z.infer<typeof VoiceSpecSchema>;

export type VoiceSample = {
  id: string;
  label: "good" | "bad";
  body: string;
  curatorTag?: "performed" | "liked" | "deleted" | "annoyed" | null;
};

export type ContentBlock = {
  type: "paragraph" | "heading" | "list" | "code";
  text: string;
};

export type ContentDoc = {
  blocks: ContentBlock[];
};

export type LintFinding = {
  rule: string;
  severity: "warn" | "error";
  blockIndex: number;
  quote: string;
  message: string;
  fix?: { kind: "replace"; from: string; to: string };
};

export type LintReport = {
  findings: LintFinding[];
  errorCount: number;
  warnCount: number;
};
