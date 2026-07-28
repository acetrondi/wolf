import { describe, expect, it } from "vitest";

import { loadEnv } from "./env";

const valid = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/wolf",
  CLERK_SECRET_KEY: "sk_test_x",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_x",
  OPENROUTER_API_KEY: "sk-or-v1-test",
} as const;

describe("loadEnv", () => {
  it("F-01: missing required var throws with the var name", () => {
    expect(() =>
      loadEnv({
        ...valid,
        DATABASE_URL: undefined,
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/DATABASE_URL/);
  });

  it("F-02: DATABASE_URL that is not a URL throws with path", () => {
    expect(() =>
      loadEnv({
        ...valid,
        DATABASE_URL: "not-a-url",
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/DATABASE_URL/);
  });

  it("accepts a valid Phase 0 env", () => {
    const parsed = loadEnv({ ...valid } as unknown as NodeJS.ProcessEnv);
    expect(parsed.APP_URL).toBe("http://localhost:3000");
    expect(parsed.AI_MODE).toBe("live");
    expect(parsed.OPENROUTER_MODEL).toBe("google/gemini-3.6-flash");
  });
});
