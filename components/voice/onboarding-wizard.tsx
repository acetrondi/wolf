"use client";

import type { VoiceOnboardingDecisions, VoiceSpec } from "@wolf/voice";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileText,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingSampleInput } from "@/lib/brands/actions";
import { proposeBrandVoice, saveBrandVoice } from "@/lib/brands/actions";

type WizardStep = "artifacts" | "curate" | "decisions" | "review";
type DraftSample = OnboardingSampleInput & { clientId: string };

type DecisionFormState = Omit<VoiceOnboardingDecisions, "offLimits" | "antiVoices"> & {
  intentOther: string;
  offLimits: string;
  antiVoices: string;
};

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const textareaClass =
  "w-full rounded-lg border border-input bg-background p-3 text-sm leading-relaxed shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const audiencePresets = [
  { value: "custom", label: "Someone else — I’ll describe them" },
  { value: "solo_founder", label: "A solo founder building a product" },
  { value: "agency_owner", label: "A small agency owner balancing clients and delivery" },
  { value: "d2c_founder", label: "A D2C founder focused on sustainable growth" },
  { value: "india_founder", label: "An Indian founder building a practical business" },
  { value: "marketing_lead", label: "An in-house marketing lead" },
] as const;

const audienceText: Record<string, string> = {
  solo_founder:
    "A solo founder building a product — technical, short on time, and allergic to fluff.",
  agency_owner: "A small agency owner balancing clients, margins, and delivery.",
  d2c_founder:
    "A D2C founder focused on sustainable growth and skeptical of easy answers.",
  india_founder:
    "An Indian founder building a practical, growing business with limited room for waste.",
  marketing_lead:
    "An in-house marketing lead who needs sound judgment and defensible results.",
};

const emptyDecisions: DecisionFormState = {
  audience: "",
  intent: "inbound",
  intentOther: "",
  competitorWontSay: "",
  offLimits: "",
  antiVoices: "",
  publicPrivateDistance: "professional_layer",
  languageMix: "en_only",
  profanity: "never",
  pov: "first_singular",
  formatPreference: "balanced",
  contrarianBelief: "",
  expensiveMistake: "",
  uniqueAccess: "",
};

function DecisionField({
  id,
  label,
  hint,
  example,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  example?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {hint ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
      {example ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">For example:</span> {example}
        </p>
      ) : null}
    </div>
  );
}

function errorMessage(error: { kind: string; message?: string }): string {
  return error.message ?? "Something went wrong. Please try again.";
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-relaxed">{children}</dd>
    </div>
  );
}

type Props = { brandId: string; brandName: string };

export function VoiceOnboardingWizard({ brandId, brandName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("artifacts");
  const [sampleText, setSampleText] = useState("");
  const [samples, setSamples] = useState<DraftSample[]>([]);
  const [audiencePreset, setAudiencePreset] = useState<string>("custom");
  const [decisions, setDecisions] = useState<DecisionFormState>(emptyDecisions);
  const [proposal, setProposal] = useState<{
    spec: VoiceSpec;
    justifications: Record<string, string>;
    confidence: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addSample(label: "good" | "bad") {
    const body = sampleText.trim();
    if (!body) return;
    setSamples((current) => [
      ...current,
      {
        body,
        label,
        clientId: crypto.randomUUID(),
        curatorTag: label === "bad" ? "annoyed" : null,
      },
    ]);
    setSampleText("");
  }

  function resolvedAudience(): string {
    return audiencePreset === "custom"
      ? decisions.audience.trim()
      : (audienceText[audiencePreset] ?? "");
  }

  async function runPropose() {
    setPending(true);
    setError(null);
    const intentNote = decisions.intent === "other" ? decisions.intentOther.trim() : "";
    const result = await proposeBrandVoice({
      brandId,
      brandName,
      decisions: {
        audience: intentNote
          ? `${resolvedAudience()} (Goal: ${intentNote})`
          : resolvedAudience(),
        intent: decisions.intent,
        competitorWontSay: decisions.competitorWontSay || undefined,
        offLimits: decisions.offLimits
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        antiVoices: decisions.antiVoices
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        publicPrivateDistance: decisions.publicPrivateDistance,
        languageMix: decisions.languageMix,
        profanity: decisions.profanity,
        pov: decisions.pov,
        formatPreference: decisions.formatPreference,
        contrarianBelief: decisions.contrarianBelief,
        expensiveMistake: decisions.expensiveMistake || undefined,
        uniqueAccess: decisions.uniqueAccess || undefined,
      },
      samples: samples.map(({ clientId: _, ...sample }) => sample),
    });
    setPending(false);
    if (!result.ok) {
      setError(errorMessage(result.error));
      return;
    }
    setProposal(
      result.value as {
        spec: VoiceSpec;
        justifications: Record<string, string>;
        confidence: string;
      },
    );
    setStep("review");
  }

  async function onSave() {
    if (!proposal) return;
    setPending(true);
    setError(null);
    const result = await saveBrandVoice({
      brandId,
      spec: proposal.spec,
      samples: samples.map(({ clientId: _, ...sample }) => sample),
    });
    setPending(false);
    if (!result.ok) {
      setError(errorMessage(result.error));
      return;
    }
    router.push(`/app/brands/${brandId}`);
    router.refresh();
  }

  const canPropose =
    Boolean(resolvedAudience()) &&
    Boolean(decisions.contrarianBelief.trim()) &&
    (decisions.intent !== "other" || Boolean(decisions.intentOther.trim()));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 pb-10">
      <header className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Brand voice setup</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              How should {brandName} sound?
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Share a few signals. We’ll turn them into a practical voice guide for you to
              review before saving.
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            About 3 minutes
          </span>
        </div>
      </header>

      {step === "artifacts" ? (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              Start with something that sounds like you
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Paste a post, email, or note. It doesn’t need to be polished. Examples help
              us pick up your rhythm — you can also skip this for now.
            </p>
          </div>
          <textarea
            className={`${textareaClass} min-h-40`}
            value={sampleText}
            onChange={(event) => setSampleText(event.target.value)}
            placeholder="Paste writing here — a LinkedIn post, client email, or honest Slack message."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!sampleText.trim()}
              onClick={() => addSample("good")}
            >
              <FileText data-icon="inline-start" /> This sounds like us
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!sampleText.trim()}
              onClick={() => addSample("bad")}
            >
              This is what to avoid
            </Button>
          </div>
          {samples.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border text-sm">
              {samples.map((sample, index) => (
                <li key={sample.clientId} className="flex items-start gap-3 p-3">
                  <span
                    className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${sample.label === "good" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    {sample.label === "good" ? "Use this" : "Avoid this"}
                  </span>
                  <p className="min-w-0 flex-1 line-clamp-2 leading-relaxed">
                    {sample.body}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove example ${index + 1}`}
                    onClick={() =>
                      setSamples((current) =>
                        current.filter((item) => item.clientId !== sample.clientId),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="text-sm text-muted-foreground">
              {samples.length
                ? `${samples.length} example${samples.length === 1 ? "" : "s"} added`
                : "No examples? That’s completely fine."}
            </p>
            <Button
              type="button"
              onClick={() => setStep(samples.length ? "curate" : "decisions")}
            >
              {samples.length ? "Choose what matters" : "Skip examples"}{" "}
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </section>
      ) : null}

      {step === "curate" ? (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">What should we pay attention to?</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A quick label helps us understand whether an example is a hit, a personal
              favourite, or a cautionary tale. This is optional.
            </p>
          </div>
          {samples.map((sample, index) => (
            <article
              key={sample.clientId}
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <p className="line-clamp-3 text-sm leading-relaxed">{sample.body}</p>
              <DecisionField id={`sample-${index}`} label="Why did you add this?">
                <select
                  id={`sample-${index}`}
                  className={selectClass}
                  value={sample.curatorTag ?? ""}
                  onChange={(event) => {
                    const curatorTag = event.target
                      .value as OnboardingSampleInput["curatorTag"];
                    setSamples((current) =>
                      current.map((item) =>
                        item.clientId === sample.clientId
                          ? { ...item, curatorTag: curatorTag || null }
                          : item,
                      ),
                    );
                  }}
                >
                  <option value="">No label — just use it as an example</option>
                  <option value="performed">It performed well</option>
                  <option value="liked">I personally like how it sounds</option>
                  <option value="deleted">I deleted it, but it’s useful context</option>
                  <option value="annoyed">This voice annoys me</option>
                </select>
              </DecisionField>
            </article>
          ))}
          <div className="flex justify-between border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={() => setStep("artifacts")}>
              <ChevronLeft data-icon="inline-start" /> Back
            </Button>
            <Button type="button" onClick={() => setStep("decisions")}>
              Continue <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </section>
      ) : null}

      {step === "decisions" ? (
        <section className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div>
            <h2 className="text-lg font-semibold">A few things only you can tell us</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              There are only two required answers. Everything else simply gives your voice
              more character.
            </p>
          </div>
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm">
            <p className="font-medium">The essentials</p>
            <p className="mt-1 text-muted-foreground">
              Who you’re speaking to, and the point of view that keeps your writing from
              sounding generic.
            </p>
          </div>
          <DecisionField
            id="audience-preset"
            label="Who are you talking to?"
            hint="Choose the closest fit. A clear reader makes the voice much more useful."
          >
            <select
              id="audience-preset"
              className={selectClass}
              value={audiencePreset}
              onChange={(event) => {
                const value = event.target.value;
                setAudiencePreset(value);
                if (value !== "custom" && audienceText[value])
                  setDecisions({ ...decisions, audience: audienceText[value] });
              }}
            >
              {audiencePresets.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </DecisionField>
          {audiencePreset === "custom" ? (
            <DecisionField
              id="audience"
              label="Describe your reader"
              example="A D2C founder who has outgrown gut-feel marketing and is wary of agencies."
            >
              <Input
                id="audience"
                value={decisions.audience}
                onChange={(event) =>
                  setDecisions({ ...decisions, audience: event.target.value })
                }
                placeholder="Who they are, what they care about, and what they’re tired of hearing."
              />
            </DecisionField>
          ) : null}
          <DecisionField
            id="intent"
            label="What do you want a good post to do?"
            hint="This sets the feel of the close — helpful, convincing, or more direct."
          >
            <select
              id="intent"
              className={selectClass}
              value={decisions.intent}
              onChange={(event) =>
                setDecisions({
                  ...decisions,
                  intent: event.target.value as DecisionFormState["intent"],
                })
              }
            >
              <option value="inbound">Start a conversation or bring in a lead</option>
              <option value="respect">Build respect with peers</option>
              <option value="hire">Make the right people want to work with us</option>
              <option value="education">Teach something useful — no hard sell</option>
              <option value="other">Something else</option>
            </select>
          </DecisionField>
          {decisions.intent === "other" ? (
            <DecisionField
              id="intent-other"
              label="What should a good post achieve?"
              example="Get investors to reply, or make peers want to share it."
            >
              <Input
                id="intent-other"
                value={decisions.intentOther}
                onChange={(event) =>
                  setDecisions({ ...decisions, intentOther: event.target.value })
                }
                placeholder="What do you want the reader to do or feel?"
              />
            </DecisionField>
          ) : null}
          <DecisionField
            id="belief"
            label="What’s an honest opinion you hold that others in your space might disagree with?"
            hint="This is not a slogan. It’s the useful tension behind your point of view."
            example="Most agencies sell certainty. I’d rather name the tradeoffs before we sign anything."
          >
            <textarea
              id="belief"
              className={`${textareaClass} min-h-28`}
              value={decisions.contrarianBelief}
              onChange={(event) =>
                setDecisions({ ...decisions, contrarianBelief: event.target.value })
              }
              placeholder="Try: “Most people in my space think X. I think Y, because…”"
            />
          </DecisionField>
          <details className="group rounded-xl border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Make it more specific{" "}
              <span className="text-muted-foreground">(optional)</span>
            </summary>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <DecisionField
                id="offlimits"
                label="What should stay private?"
                example="Client names, exact revenue, family, or failures still in progress."
              >
                <Input
                  id="offlimits"
                  value={decisions.offLimits}
                  onChange={(event) =>
                    setDecisions({ ...decisions, offLimits: event.target.value })
                  }
                  placeholder="Separate items with commas"
                />
              </DecisionField>
              <DecisionField
                id="antivoice"
                label="What kind of voice should we avoid?"
                example="Corporate LinkedIn guru, hype founder, passive-aggressive coach."
              >
                <Input
                  id="antivoice"
                  value={decisions.antiVoices}
                  onChange={(event) =>
                    setDecisions({ ...decisions, antiVoices: event.target.value })
                  }
                  placeholder="People, brands, or vibes — comma-separated"
                />
              </DecisionField>
              <DecisionField
                id="wontsay"
                label="What will you say that others tend to smooth over?"
                example="We’ll walk away from a bad fit, and say why."
              >
                <Input
                  id="wontsay"
                  value={decisions.competitorWontSay}
                  onChange={(event) =>
                    setDecisions({ ...decisions, competitorWontSay: event.target.value })
                  }
                  placeholder="The plain truth you’re comfortable saying"
                />
              </DecisionField>
              <DecisionField id="pov" label="Who is speaking?">
                <select
                  id="pov"
                  className={selectClass}
                  value={decisions.pov}
                  onChange={(event) =>
                    setDecisions({
                      ...decisions,
                      pov: event.target.value as DecisionFormState["pov"],
                    })
                  }
                >
                  <option value="first_singular">
                    I — a founder or individual voice
                  </option>
                  <option value="first_plural">We — a company voice</option>
                  <option value="second">You — speak directly to the reader</option>
                </select>
              </DecisionField>
              <DecisionField id="format" label="What should posts usually feel like?">
                <select
                  id="format"
                  className={selectClass}
                  value={decisions.formatPreference}
                  onChange={(event) =>
                    setDecisions({
                      ...decisions,
                      formatPreference: event.target
                        .value as DecisionFormState["formatPreference"],
                    })
                  }
                >
                  <option value="short_claim">Short and clear — point first</option>
                  <option value="balanced">Balanced — a point with enough context</option>
                  <option value="long_story">Story-led — more scene and detail</option>
                </select>
              </DecisionField>
              <DecisionField
                id="distance"
                label="How polished should the public voice be?"
              >
                <select
                  id="distance"
                  className={selectClass}
                  value={decisions.publicPrivateDistance}
                  onChange={(event) =>
                    setDecisions({
                      ...decisions,
                      publicPrivateDistance: event.target
                        .value as DecisionFormState["publicPrivateDistance"],
                    })
                  }
                >
                  <option value="zero">Just like us in real life</option>
                  <option value="professional_layer">
                    Professional, but still human
                  </option>
                  <option value="highly_curated">
                    A deliberately polished public voice
                  </option>
                </select>
              </DecisionField>
            </div>
          </details>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(samples.length ? "curate" : "artifacts")}
            >
              <ChevronLeft data-icon="inline-start" /> Back
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {canPropose ? "Ready when you are" : "Add the required answers above"}
              </span>
              <Button
                type="button"
                disabled={pending || !canPropose}
                onClick={runPropose}
              >
                <Sparkles data-icon="inline-start" />{" "}
                {pending ? "Creating your voice…" : "Create voice proposal"}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {step === "review" && proposal ? (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Here’s the voice we’d use</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                This is a starting point, built from your answers
                {samples.length
                  ? ` and ${samples.length} example${samples.length === 1 ? "" : "s"}`
                  : ""}
                .
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {proposal.confidence} confidence
            </span>
          </div>
          <dl className="rounded-xl border border-border px-4">
            <SummaryRow label="Speaking to">
              {proposal.spec.positioning.audience}
            </SummaryRow>
            <SummaryRow label="Point of view">
              {proposal.spec.positioning.spine}
            </SummaryRow>
            <SummaryRow label="Tone">
              {proposal.spec.axes.directness >= 4
                ? "Clear and direct"
                : "Measured and considered"}
              , {proposal.spec.axes.warmth >= 4 ? "warm" : "grounded"}, and{" "}
              {proposal.spec.axes.formality <= 2 ? "conversational" : "professional"}.
            </SummaryRow>
            <SummaryRow label="Post shape">
              {proposal.spec.rhythm.opener_style === "claim"
                ? "Lead with the point"
                : "Lead with context"}
              , then keep paragraphs to about{" "}
              {proposal.spec.rhythm.paragraph_max_sentences} sentences.
            </SummaryRow>
            <SummaryRow label="Avoid">
              {proposal.spec.boundaries.anti_voices.length
                ? proposal.spec.boundaries.anti_voices.join(", ")
                : "generic AI language and empty hype"}
            </SummaryRow>
          </dl>
          <details className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              See the reasoning behind this proposal
            </summary>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {Object.entries(proposal.justifications).map(([key, value]) => (
                <li key={key}>
                  <span className="font-medium text-foreground">
                    {key.replaceAll(".", " · ")}:
                  </span>{" "}
                  {value}
                </li>
              ))}
            </ul>
          </details>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setStep("decisions")}
            >
              <ChevronLeft data-icon="inline-start" /> Edit answers
            </Button>
            <Button type="button" disabled={pending} onClick={onSave}>
              <Check data-icon="inline-start" />{" "}
              {pending ? "Saving voice…" : "Save this voice"}
            </Button>
          </div>
        </section>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <CircleAlert className="size-4 shrink-0" /> {error}
        </p>
      ) : null}
    </div>
  );
}
