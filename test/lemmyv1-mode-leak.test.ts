// Regression: `mode` is a threadiverse-public-API discriminator for typed
// sort params — it must never reach a provider's wire format. Verify
// `fromPageParams` strips it for every paged v1 endpoint that callers use to
// pass sort-typed payloads.

import { describe, expect, it } from "vitest";

import { fromPageParams } from "../src/providers/lemmyv1/compat";

describe("v1 fromPageParams - strips internal threadiverse fields", () => {
  it("strips `mode`", () => {
    const out = fromPageParams({
      limit: 20,
      mode: "lemmyv1",
      page_cursor: "cursor1",
    } as never);
    expect(out).not.toHaveProperty("mode");
    expect(out).toEqual({ limit: 20, page_cursor: "cursor1" });
  });

  it("does not mutate the caller's payload", () => {
    const original = {
      limit: 20,
      mode: "lemmyv1",
      page_cursor: "cursor1",
    };
    fromPageParams(original as never);
    expect(original).toHaveProperty("mode", "lemmyv1");
  });

  it("passes through other fields untouched", () => {
    const out = fromPageParams({
      community_id: 7,
      limit: 5,
      mode: "lemmyv1",
      page_cursor: undefined,
      sort: "hot",
    } as never);
    expect(out).toEqual({
      community_id: 7,
      limit: 5,
      page_cursor: undefined,
      sort: "hot",
    });
  });
});
