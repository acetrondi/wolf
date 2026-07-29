"use client";

import type { BrandPlatformGuidance } from "@wolf/contracts";
import { Check } from "lucide-react";
import { useState } from "react";

import { CopyRulesPrompt } from "@/components/platforms/copy-rules-prompt";
import {
  createWritingRulesTemplate,
  WritingRulesEditor,
} from "@/components/platforms/writing-rules-editor";
import { Button } from "@/components/ui/button";
import {
  copyBrandPlatformRulesToMissingPlatforms,
  saveBrandPlatformGuidance,
} from "@/lib/brands/platform-actions";
import { platformRulesErrorMessage } from "@/lib/brands/platform-error-message";

type Platform = {
  slug: string;
  name: string;
  promoNote: string;
  supportsTitle: boolean;
  supportsSubtitle: boolean;
};
type Profile = { isEnabled: boolean; guidance: BrandPlatformGuidance };
type Props = {
  brandId: string;
  platforms: Platform[];
  profiles: Record<string, Profile>;
};

function emptyGuidance(platform: Platform | undefined): BrandPlatformGuidance {
  return {
    openingGuidance: null,
    closingGuidance: null,
    headlineGuidance: null,
    requiredElements: [],
    avoidElements: [],
    customRules: [],
    writingRules: platform
      ? createWritingRulesTemplate({
          supportsTitle: platform.supportsTitle,
          supportsSubtitle: platform.supportsSubtitle,
        })
      : null,
  };
}

function guidanceFor(
  platform: Platform | undefined,
  existing: BrandPlatformGuidance | undefined,
): BrandPlatformGuidance {
  const fallback = emptyGuidance(platform);
  if (!existing) return fallback;
  return { ...existing, writingRules: existing.writingRules ?? fallback.writingRules };
}

export function PlatformGuidanceForm({ brandId, platforms, profiles }: Props) {
  const [localProfiles, setLocalProfiles] = useState(profiles);
  const [slug, setSlug] = useState(platforms[0]?.slug ?? "");
  const firstPlatform = platforms[0];
  const [isEnabled, setIsEnabled] = useState(localProfiles[slug]?.isEnabled ?? true);
  const [guidance, setGuidance] = useState<BrandPlatformGuidance>(
    guidanceFor(firstPlatform, localProfiles[slug]?.guidance),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [missingPlatformCount, setMissingPlatformCount] = useState(0);
  const [isCopyPromptOpen, setIsCopyPromptOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const platform = platforms.find((item) => item.slug === slug);

  function select(next: string) {
    const nextPlatform = platforms.find((item) => item.slug === next);
    setSlug(next);
    setIsEnabled(localProfiles[next]?.isEnabled ?? true);
    setGuidance(guidanceFor(nextPlatform, localProfiles[next]?.guidance));
    setMessage(null);
  }

  async function save() {
    setIsSaving(true);
    setMessage(null);
    const result = await saveBrandPlatformGuidance({
      brandId,
      platformSlug: slug,
      isEnabled,
      guidance,
    });
    setIsSaving(false);
    if (!result.ok) {
      setMessage(platformRulesErrorMessage(result.error));
      return;
    }

    setLocalProfiles((current) => ({
      ...current,
      [slug]: { isEnabled, guidance },
    }));
    setMessage("Rules saved.");
    setMissingPlatformCount(result.value.missingPlatformCount);
    setIsCopyPromptOpen(result.value.missingPlatformCount > 0);
  }

  async function copyRules() {
    setIsCopying(true);
    const result = await copyBrandPlatformRulesToMissingPlatforms({
      brandId,
      sourcePlatformSlug: slug,
    });
    setIsCopying(false);
    setIsCopyPromptOpen(false);
    if (!result.ok) {
      setMessage(platformRulesErrorMessage(result.error));
      return;
    }

    setLocalProfiles((current) => {
      const next = { ...current };
      for (const target of platforms) {
        if (target.slug === slug || current[target.slug]?.guidance.writingRules) continue;
        const currentProfile = current[target.slug];
        next[target.slug] = {
          isEnabled: currentProfile?.isEnabled ?? true,
          guidance: {
            ...(currentProfile?.guidance ?? emptyGuidance(target)),
            writingRules: guidance.writingRules,
          },
        };
      }
      return next;
    });
    const count = result.value.copiedPlatformCount;
    setMissingPlatformCount(0);
    setMessage(
      count === 1
        ? "Rules applied to 1 other platform."
        : `Rules applied to ${count} other platforms.`,
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <section className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Platform rules</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              How should {platform?.name} content feel?
            </h1>
            <select
              value={slug}
              onChange={(event) => select(event.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {platforms.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Set the rules in plain language. Wolf applies them alongside {platform?.name}
            's built-in limits. {platform?.promoNote}
          </p>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-border p-4 text-sm font-medium">
          Create {platform?.name} variants
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(event) => setIsEnabled(event.target.checked)}
          />
        </label>

        {platform ? (
          <div className="space-y-2">
            <div>
              <h2 className="text-sm font-medium">Writing rules</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use headings for the parts you want to control. Keep each rule short and
                concrete.
              </p>
            </div>
            <WritingRulesEditor
              key={slug}
              value={guidance.writingRules}
              onChange={(writingRules) => setGuidance({ ...guidance, writingRules })}
              supportsTitle={platform.supportsTitle}
              supportsSubtitle={platform.supportsSubtitle}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-border pt-5">
          {message ? (
            <p className="text-sm text-muted-foreground" role="status">
              {message}
            </p>
          ) : (
            <span />
          )}
          <Button type="button" disabled={isSaving || isCopying || !slug} onClick={save}>
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Check data-icon="inline-start" />
                Save rules
              </>
            )}
          </Button>
        </div>
        <CopyRulesPrompt
          open={isCopyPromptOpen}
          platformName={platform?.name ?? "platform"}
          missingPlatformCount={missingPlatformCount}
          isCopying={isCopying}
          onCopy={copyRules}
          onDecline={() => setIsCopyPromptOpen(false)}
        />
      </section>
    </div>
  );
}
