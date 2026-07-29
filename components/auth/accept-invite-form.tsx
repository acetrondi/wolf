"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { acceptOrgInvite } from "@/lib/tenant/actions";

type AcceptInviteFormProps = {
  token: string;
  email: string;
};

export function AcceptInviteForm({ token, email }: AcceptInviteFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onAccept() {
    setPending(true);
    setError(null);
    const result = await acceptOrgInvite(token);
    setPending(false);
    if (!result.ok) {
      setError(
        result.error.kind === "validation"
          ? result.error.message
          : "Could not accept this invite.",
      );
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{email}</span>
      </p>
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
      <Button className="w-full" disabled={pending} onClick={onAccept}>
        {pending ? "Joining…" : "Accept invite"}
      </Button>
    </div>
  );
}
