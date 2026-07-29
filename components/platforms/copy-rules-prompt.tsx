"use client";

import { CopyIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CopyRulesPrompt({
  open,
  platformName,
  missingPlatformCount,
  isCopying,
  onCopy,
  onDecline,
}: {
  open: boolean;
  platformName: string;
  missingPlatformCount: number;
  isCopying: boolean;
  onCopy: () => void;
  onDecline: () => void;
}) {
  const platformWord = missingPlatformCount === 1 ? "platform" : "platforms";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isCopying) onDecline();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <CopyIcon aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Apply these rules to other platforms?</AlertDialogTitle>
          <AlertDialogDescription>
            {missingPlatformCount} other {platformWord} do not have writing rules yet.
            Copy your {platformName} rules to them as a starting point? Existing rules
            will not be changed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCopying}>No, keep separate</AlertDialogCancel>
          <AlertDialogAction type="button" onClick={onCopy} disabled={isCopying}>
            {isCopying ? "Applying..." : "Yes, apply rules"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
