import { describe, expect, it } from "vitest";

import { PLATFORM_REGISTRY } from "../registry";

describe("platform registry", () => {
  it("P-01/P-02: contains 11 unique, valid platform configs", () => {
    expect(PLATFORM_REGISTRY).toHaveLength(11);
    expect(new Set(PLATFORM_REGISTRY.map((config) => config.slug)).size).toBe(11);
  });
});
