import { z } from "zod";

/** Treat empty strings from .env as undefined so optional fields work. */
function emptyToUndefined(value: unknown): unknown {
  if (value === "") return undefined;
  return value;
}

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

/**
 * Phase 0 env contract.
 * Required: boot essentials (app, Neon, Clerk, OpenRouter).
 * Optional: deferred until the phase that needs them (email, S3, calendar, crypto).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.preprocess(emptyToUndefined, z.string().url()),

  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().url()),
  DATABASE_URL_MIGRATOR: optionalUrl,

  CLERK_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().min(1)),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.preprocess(emptyToUndefined, z.string().min(1)),
  CLERK_WEBHOOK_SECRET: optionalString,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.preprocess(
    emptyToUndefined,
    z.string().default("/auth/sign-in"),
  ),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.preprocess(
    emptyToUndefined,
    z.string().default("/auth/sign-up"),
  ),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.preprocess(
    emptyToUndefined,
    z.string().default("/app"),
  ),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.preprocess(
    emptyToUndefined,
    z.string().default("/app"),
  ),

  OPENROUTER_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1)),
  OPENROUTER_MODEL: z.preprocess(
    emptyToUndefined,
    z.string().default("google/gemini-3.6-flash"),
  ),
  ANTHROPIC_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  AI_MODE: z.enum(["live", "fake"]).default("live"),

  S3_ENDPOINT: optionalUrl,
  S3_REGION: z.preprocess(emptyToUndefined, z.string().default("auto")),
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,

  RESEND_API_KEY: optionalString,
  EMAIL_FROM: z.preprocess(emptyToUndefined, z.string().email().optional()),

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  TRIGGER_SECRET_KEY: optionalString,

  ENCRYPTION_KEY: z.preprocess(emptyToUndefined, z.string().length(64).optional()),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${details}`);
  }
  return result.data;
}
