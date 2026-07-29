"use client";

import type { BrandPlatformGuidance } from "@wolf/contracts";
import { CheckIcon } from "lucide-react";
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

type Props = {
  platform: {
    slug: string;
    name: string;
    supportsTitle: boolean;
    supportsSubtitle: boolean;
  };
  brandId: string | null;
  brandName: string | null;
  initialGuidance: BrandPlatformGuidance | null;
  initialEnabled: boolean;
};

export function PlatformRulesPanel({
  platform,
  brandId,
  brandName,
  initialGuidance,
  initialEnabled,
}: Props) {
  const template = createWritingRulesTemplate({
    supportsTitle: platform.supportsTitle,
    supportsSubtitle: platform.supportsSubtitle,
  });
  const [guidance, setGuidance] = useState<BrandPlatformGuidance>(
    initialGuidance
      ? { ...initialGuidance, writingRules: initialGuidance.writingRules ?? template }
      : {
          openingGuidance: null,
          closingGuidance: null,
          headlineGuidance: null,
          requiredElements: [],
          avoidElements: [],
          customRules: [],
          writingRules: template,
        },
  );
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [missingPlatformCount, setMissingPlatformCount] = useState(0);
  const [isCopyPromptOpen, setIsCopyPromptOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!brandId || !brandName) {
    return (
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Writing rules</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a brand first. The editor will appear here and save rules only for that
          brand.
        </p>
      </section>
    );
  }

  async function save() {
    if (!brandId) return;
    setIsSaving(true);
    setMessage(null);
    const result = await saveBrandPlatformGuidance({
      brandId,
      platformSlug: platform.slug,
      isEnabled,
      guidance,
    });
    setIsSaving(false);
    if (!result.ok) {
      setMessage(platformRulesErrorMessage(result.error));
      return;
    }

    setMessage("Rules saved.");
    setMissingPlatformCount(result.value.missingPlatformCount);
    setIsCopyPromptOpen(result.value.missingPlatformCount > 0);
  }

  async function copyRules() {
    if (!brandId) return;
    setIsCopying(true);
    const result = await copyBrandPlatformRulesToMissingPlatforms({
      brandId,
      sourcePlatformSlug: platform.slug,
    });
    setIsCopying(false);
    setIsCopyPromptOpen(false);
    if (!result.ok) {
      setMessage(platformRulesErrorMessage(result.error));
      return;
    }

    const count = result.value.copiedPlatformCount;
    setMissingPlatformCount(0);
    setMessage(
      count === 1
        ? "Rules applied to 1 other platform."
        : `Rules applied to ${count} other platforms.`,
    );
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="font-semibold">Writing rules</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These rules apply only to {brandName}'s {platform.name} content.
        </p>
      </div>
      <WritingRulesEditor
        key={brandId}
        value={guidance.writingRules}
        onChange={(writingRules) => setGuidance({ ...guidance, writingRules })}
        supportsTitle={platform.supportsTitle}
        supportsSubtitle={platform.supportsSubtitle}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(event) => setIsEnabled(event.target.checked)}
          />
          Create {platform.name} variants
        </label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground" role="status">
            {message}
          </span>
          <Button type="button" onClick={save} disabled={isSaving || isCopying}>
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <CheckIcon data-icon="inline-start" />
                Save rules
              </>
            )}
          </Button>
        </div>
      </div>
      <CopyRulesPrompt
        open={isCopyPromptOpen}
        platformName={platform.name}
        missingPlatformCount={missingPlatformCount}
        isCopying={isCopying}
        onCopy={copyRules}
        onDecline={() => setIsCopyPromptOpen(false)}
      />
    </section>
  );
}
