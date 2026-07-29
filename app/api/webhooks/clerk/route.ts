import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { loadEnv } from "@wolf/config";
import {
  provisionClerkUser,
  recordWebhookEvent,
  softDeleteClerkUser,
  updateClerkUser,
  withSystem,
} from "@wolf/db";
import type { NextRequest } from "next/server";

type ClerkUserPayload = {
  id: string;
  email_addresses?: { email_address: string }[];
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
};

function primaryEmail(data: ClerkUserPayload): string | null {
  return data.email_addresses?.[0]?.email_address ?? null;
}

function displayName(data: ClerkUserPayload): string | null {
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return name || null;
}

export async function POST(req: NextRequest) {
  const env = loadEnv();
  const signingSecret = env.CLERK_WEBHOOK_SECRET;
  if (!signingSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const eventId = req.headers.get("svix-id");
  if (!eventId) {
    return new Response("Missing event id", { status: 400 });
  }

  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req, { signingSecret });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const deduped = await withSystem("clerk webhook dedupe", async (tx) =>
    recordWebhookEvent(tx, eventId, evt.type),
  );
  if (deduped === "duplicate") {
    return new Response("OK", { status: 200 });
  }

  try {
    if (evt.type === "user.created") {
      const data = evt.data as ClerkUserPayload;
      const email = primaryEmail(data);
      if (!email) {
        return new Response("Missing email", { status: 400 });
      }
      await withSystem("clerk user.created", async (tx) =>
        provisionClerkUser(tx, {
          externalAuthId: data.id,
          email,
          displayName: displayName(data),
          avatarUrl: data.image_url ?? null,
        }),
      );
    }

    if (evt.type === "user.updated") {
      const data = evt.data as ClerkUserPayload;
      const email = primaryEmail(data);
      if (!email) {
        return new Response("Missing email", { status: 400 });
      }
      await withSystem("clerk user.updated", async (tx) =>
        updateClerkUser(tx, {
          externalAuthId: data.id,
          email,
          displayName: displayName(data),
          avatarUrl: data.image_url ?? null,
        }),
      );
    }

    if (evt.type === "user.deleted") {
      const data = evt.data as { id: string };
      await withSystem("clerk user.deleted", async (tx) =>
        softDeleteClerkUser(tx, data.id),
      );
    }
  } catch (error) {
    console.error("Clerk webhook handler failed:", error);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
