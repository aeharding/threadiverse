// The page-number providers (Lemmy v0, PieFed) don't all report whether
// more pages exist, so `toPageResponse` derives it. Getting this wrong is
// invisible in the fakes — neither models lemmyv0 — but breaks real feeds,
// so the rules are pinned here directly.

import { describe, expect, it } from "vitest";

import { InvalidPayloadError } from "../src/errors";
import { toPageResponse } from "../src/providers/lemmyv0/compat";

describe("toPageResponse", () => {
  it("prefers the server's own cursor", () => {
    expect(
      toPageResponse({ limit: 10 }, { items: 10, next_page: "3" }),
    ).toEqual({ next_page: 3 });
  });

  it("treats a null server cursor as end of feed", () => {
    expect(
      toPageResponse({ limit: 10 }, { items: 10, next_page: null }),
    ).toEqual({ next_page: undefined });
  });

  it("treats an unusable server cursor as end of feed", () => {
    // Sending a NaN page number back would be worse than stopping
    expect(
      toPageResponse({ limit: 10 }, { items: 10, next_page: "abc" }),
    ).toEqual({ next_page: undefined });
  });

  it("infers another page from a full one", () => {
    expect(toPageResponse({ limit: 10 }, { items: 10 })).toEqual({
      next_page: 2,
    });
    expect(
      toPageResponse({ limit: 10, page_cursor: 4 }, { items: 10 }),
    ).toEqual({ next_page: 5 });
  });

  it("infers end of feed from a short page", () => {
    expect(toPageResponse({ limit: 10 }, { items: 9 })).toEqual({
      next_page: undefined,
    });
    expect(toPageResponse({ limit: 10 }, { items: 0 })).toEqual({
      next_page: undefined,
    });
  });

  it("keeps paging when a merged page overshoots the limit", () => {
    // Endpoints that merge several requests (notifications, person content,
    // all-type search, modlog) get `limit` items *per bucket*, so page one
    // legitimately returns more than the limit — it is not the last page
    expect(toPageResponse({ limit: 5 }, { items: 70 })).toEqual({
      next_page: 2,
    });
    expect(toPageResponse({ limit: 5 }, { items: 20 })).toEqual({
      next_page: 2,
    });
  });

  it("assumes more when there's no limit to compare against", () => {
    expect(toPageResponse({}, { items: 3 })).toEqual({ next_page: 2 });
    expect(toPageResponse({})).toEqual({ next_page: 2 });
  });

  it("rejects string cursors, which these providers can't page with", () => {
    expect(() => toPageResponse({ page_cursor: "abc" }, { items: 1 })).toThrow(
      InvalidPayloadError,
    );
  });
});
