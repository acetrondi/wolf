import { describe, expect, it } from "vitest";

import { BrandPlatformGuidanceSchema } from "./brand-platform-guidance";
import { normalizeJson } from "./normalize-json";

describe("BrandPlatformGuidanceSchema", () => {
  it("accepts and preserves Tiptap marks and nullable attributes", () => {
    const result = BrandPlatformGuidanceSchema.parse({
      openingGuidance: null,
      closingGuidance: null,
      headlineGuidance: null,
      requiredElements: [],
      avoidElements: [],
      customRules: [],
      writingRules: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: null,
            content: [
              {
                type: "text",
                text: "A bold rule",
                marks: [{ type: "bold", attrs: null }],
              },
            ],
          },
        ],
      },
    });

    expect(result.writingRules?.content).toEqual([
      {
        type: "paragraph",
        attrs: null,
        content: [
          {
            type: "text",
            text: "A bold rule",
            marks: [{ type: "bold", attrs: null }],
          },
        ],
      },
    ]);
  });

  it("normalizes function-shaped attributes into plain JSON data", () => {
    const attrs = Object.assign(() => undefined, { level: 1 });
    const normalized = normalizeJson({
      type: "doc",
      content: [{ type: "heading", attrs }],
    });

    expect(normalized).toEqual({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 1 } }],
    });
    expect(() =>
      BrandPlatformGuidanceSchema.parse({ writingRules: normalized }),
    ).not.toThrow();
  });
});
