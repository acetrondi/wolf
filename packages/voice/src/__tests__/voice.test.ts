import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { compileVoiceCard } from "../compile";
import { extractFeatures } from "../features";
import { lintVoice } from "../lint";
import { proposeVoiceSpec } from "../onboarding";
import type { VoiceSpec } from "../spec";
import { VoiceSpecSchema } from "../spec";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const itsarises = VoiceSpecSchema.parse(
  JSON.parse(readFileSync(path.join(__dirname, "../fixtures/itsarises.json"), "utf8")),
);

describe("compileVoiceCard", () => {
  it("V-01: same spec + samples â†’ identical hash", () => {
    const samples = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        label: "good" as const,
        body: "I shipped it.",
      },
    ];
    const a = compileVoiceCard({ spec: itsarises, samples });
    const b = compileVoiceCard({ spec: itsarises, samples });
    expect(a.card).toBe(b.card);
    expect(a.hash).toBe(b.hash);
  });

  it("V-02: reordering banned lexicon â†’ identical hash", () => {
    const shuffled: VoiceSpec = {
      ...itsarises,
      lexicon: {
        ...itsarises.lexicon,
        banned: [...itsarises.lexicon.banned].reverse(),
      },
    };
    const a = compileVoiceCard({ spec: itsarises, samples: [] });
    const b = compileVoiceCard({ spec: shuffled, samples: [] });
    expect(a.hash).toBe(b.hash);
  });

  it("V-03: adding an exemplar changes the hash", () => {
    const base = compileVoiceCard({ spec: itsarises, samples: [] });
    const withSample = compileVoiceCard({
      spec: itsarises,
      samples: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          label: "good",
          body: "I shipped it, measured it, and wrote down what broke.",
        },
      ],
    });
    expect(withSample.hash).not.toBe(base.hash);
  });

  it("V-04: keeps a maximal card within the token budget", () => {
    const body = Array.from({ length: 300 }, (_, index) => `word${index}`).join(" ");
    const samples = Array.from({ length: 10 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      label: index < 6 ? ("good" as const) : ("bad" as const),
      body,
    }));
    expect(
      compileVoiceCard({ spec: itsarises, samples }).tokenEstimate,
    ).toBeLessThanOrEqual(900);
  });

  it("V-05: exemplar selection and truncation are order-independent", () => {
    const samples = [
      {
        id: "00000000-0000-4000-8000-000000000002",
        label: "good" as const,
        body: "second",
      },
      {
        id: "00000000-0000-4000-8000-000000000001",
        label: "good" as const,
        body: "first",
      },
    ];
    const ordered = compileVoiceCard({ spec: itsarises, samples });
    const reversed = compileVoiceCard({
      spec: itsarises,
      samples: [...samples].reverse(),
    });
    expect(ordered).toEqual(reversed);
  });

  it("V-17: remains deterministic for 200 valid spec variations", () => {
    for (let index = 0; index < 200; index++) {
      const spec: VoiceSpec = {
        ...itsarises,
        axes: {
          ...itsarises.axes,
          formality: (index % 5) + 1,
          directness: ((index * 3) % 5) + 1,
        },
      };
      expect(compileVoiceCard({ spec, samples: [] })).toEqual(
        compileVoiceCard({ spec, samples: [] }),
      );
    }
  });
});

describe("extractFeatures", () => {
  it("V-22: stable across line endings", () => {
    const a = extractFeatures("Hello world.\r\nSecond line.");
    const b = extractFeatures("Hello world.\nSecond line.");
    expect(a.sentences).toBe(b.sentences);
  });

  it("V-23: empty doc does not throw", () => {
    const f = extractFeatures("");
    expect(f.sentences).toBe(0);
    expect(f.avgSentenceWords).toBe(0);
  });
});

describe("lintVoice", () => {
  it("V-20: skips code blocks for SL-008", () => {
    const doc = {
      blocks: [{ type: "code" as const, text: "const leverage = true;" }],
    };
    const report = lintVoice(doc, { spec: itsarises });
    expect(report.findings.some((f) => f.rule === "SL-008")).toBe(false);
  });

  it("SL-008 fires on AI vocabulary in prose", () => {
    const doc = {
      blocks: [{ type: "paragraph" as const, text: "We leverage seamless workflows." }],
    };
    const report = lintVoice(doc, { spec: itsarises });
    expect(report.findings.some((f) => f.rule === "SL-008")).toBe(true);
  });

  it("V-21: includes the full offending sentence as a quote", () => {
    const text =
      "We shipped the change yesterday. We leverage a simpler release process.";
    const report = lintVoice(
      { blocks: [{ type: "paragraph", text }] },
      { spec: itsarises },
    );
    const finding = report.findings.find((item) => item.rule === "SL-008");
    expect(finding?.quote).toBe("We leverage a simpler release process.");
    expect(text).toContain(finding?.quote);
  });

  it("V-28: lints a 5000-word document within the performance budget", () => {
    const text = Array.from({ length: 5000 }, () => "measured").join(" ");
    const start = performance.now();
    lintVoice({ blocks: [{ type: "paragraph", text }] }, { spec: itsarises });
    expect(performance.now() - start).toBeLessThan(150);
  });
});

describe("proposeVoiceSpec", () => {
  it("cold start is low confidence", () => {
    const { spec } = proposeVoiceSpec({
      brandName: "Acme",
      decisions: {
        audience: "solo founders in Austin",
        intent: "inbound",
        offLimits: ["politics"],
        antiVoices: ["corporate guru"],
        publicPrivateDistance: "professional_layer",
        languageMix: "en_only",
        profanity: "never",
        pov: "first_singular",
        formatPreference: "balanced",
        contrarianBelief: "Tradeoffs beat guarantees.",
      },
      samples: [],
    });
    expect(spec.meta?.confidence).toBe("low");
    expect(spec.meta?.provenance).toBe("decisions");
  });
});

describe("itsarises snapshot hash", () => {
  it("hash-locks the seed fixture", () => {
    const { hash } = compileVoiceCard({ spec: itsarises, samples: [] });
    expect(hash).toBe("775b71af617385b17c552a0044cb1de761e8029b0beb89ca59248c55e2427d06");
  });
});
