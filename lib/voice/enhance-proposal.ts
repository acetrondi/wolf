import { loadEnv } from "@wolf/config";
import type { VoiceOnboardingDecisions, VoiceSpec } from "@wolf/voice";
import { VoiceSpecSchema } from "@wolf/voice";

import type { OnboardingSampleInput } from "@/lib/brands/actions";

/** Optional OpenRouter pass — falls back to deterministic draft on failure. */
export async function enhanceVoiceProposal(input: {
  draft: VoiceSpec;
  justifications: Record<string, string>;
  samples: OnboardingSampleInput[];
  decisions: VoiceOnboardingDecisions;
}): Promise<{ spec: VoiceSpec; justifications: Record<string, string> }> {
  const env = loadEnv();
  if (env.AI_MODE !== "live") {
    return { spec: input.draft, justifications: input.justifications };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You refine a VoiceSpec JSON object. Return ONLY valid JSON matching the input shape. Keep meta.provenance and meta.confidence. Improve persona.role, rules.must, and lexicon based on samples and decisions. Do not invent samples.",
          },
          {
            role: "user",
            content: JSON.stringify({
              draft: input.draft,
              decisions: input.decisions,
              sampleCount: input.samples.length,
            }),
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return { spec: input.draft, justifications: input.justifications };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { spec: input.draft, justifications: input.justifications };
    }

    const parsed = VoiceSpecSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      return { spec: input.draft, justifications: input.justifications };
    }

    return {
      spec: parsed.data,
      justifications: {
        ...input.justifications,
        llm: "OpenRouter refined persona, rules, and lexicon.",
      },
    };
  } catch {
    return { spec: input.draft, justifications: input.justifications };
  }
}
