"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrand } from "@/lib/brands/actions";

export function NewBrandForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await createBrand(name.trim());
    setPending(false);
    if (!result.ok) {
      setError("Could not create brand.");
      return;
    }
    router.push(`/app/brands/${result.value.id}/voice/onboarding`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="name">Brand name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ItsArises"
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending || !name.trim()}>
        {pending ? "Creating…" : "Continue to voice setup"}
      </Button>
    </form>
  );
}
