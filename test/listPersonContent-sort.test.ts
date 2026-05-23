// Regression: a prior fix in lemmyv0 hardcoded `sort: "New"` in
// listPersonContent to add a sane default, but the spread order meant it
// clobbered any sort the caller passed. The bug went unnoticed for months
// because no test asserted the wire shape. Same bug existed in piefed for
// its #listPersonComments / #listPersonPosts paths.
//
// Pin both: the caller's `sort` must reach the wire when provided, and "New"
// is only used when the caller omits it.

import { describe, expect, it, vi } from "vitest";

import { BaseClientOptions } from "../src/BaseClient";
import ThreadiverseClient from "../src/ThreadiverseClient";

function makeMockedClient(
  hostname: string,
  software: { name: string; version: string },
  routes: (url: string, init?: RequestInit) => Response | undefined,
) {
  const fetchFunction = vi.fn(async (url: unknown, init?: RequestInit) => {
    const urlStr =
      typeof url === "string"
        ? url
        : url instanceof URL
          ? url.toString()
          : (url as Request).url;

    if (urlStr.endsWith("/.well-known/nodeinfo")) {
      return new Response(
        JSON.stringify({
          links: [
            {
              href: `https://${hostname}/nodeinfo/2.1`,
              rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (urlStr === `https://${hostname}/nodeinfo/2.1`) {
      return new Response(JSON.stringify({ software }), { status: 200 });
    }
    const handled = routes(urlStr, init);
    if (handled) return handled;
    throw new Error(`Unexpected fetch: ${urlStr}`);
  });

  const options: BaseClientOptions = { fetchFunction, headers: {} };
  return new ThreadiverseClient(`https://${hostname}`, options);
}

describe("listPersonContent - sort propagation", () => {
  describe("lemmyv0", () => {
    it("forwards caller's sort to getPersonDetails", async () => {
      let capturedUrl: string | undefined;
      const client = makeMockedClient(
        "v0.test.lemmy",
        { name: "lemmy", version: "0.19.11" },
        (urlStr) => {
          if (urlStr.includes("/api/v3/user")) {
            capturedUrl = urlStr;
            return new Response(
              JSON.stringify({
                comments: [],
                moderates: [],
                person_view: {
                  counts: {
                    comment_count: 0,
                    comment_score: 0,
                    person_id: 1,
                    post_count: 0,
                    post_score: 0,
                  },
                  is_admin: false,
                  person: {
                    actor_id: "https://v0.test.lemmy/u/alex",
                    banned: false,
                    bot_account: false,
                    deleted: false,
                    id: 1,
                    instance_id: 1,
                    local: true,
                    name: "alex",
                    published: "2026-01-01T00:00:00Z",
                  },
                },
                posts: [],
              }),
              { status: 200 },
            );
          }
        },
      );

      await client.listPersonContent({
        mode: "lemmyv0",
        person_id: 1,
        sort: "Hot",
        type: "posts",
      });

      expect(capturedUrl).toBeDefined();
      const params = new URLSearchParams(capturedUrl!.split("?")[1]);
      expect(params.get("sort")).toBe("Hot");
    });

    it("defaults to New when caller omits sort", async () => {
      let capturedUrl: string | undefined;
      const client = makeMockedClient(
        "v0.test.lemmy",
        { name: "lemmy", version: "0.19.11" },
        (urlStr) => {
          if (urlStr.includes("/api/v3/user")) {
            capturedUrl = urlStr;
            return new Response(
              JSON.stringify({
                comments: [],
                moderates: [],
                person_view: {
                  counts: {
                    comment_count: 0,
                    comment_score: 0,
                    person_id: 1,
                    post_count: 0,
                    post_score: 0,
                  },
                  is_admin: false,
                  person: {
                    actor_id: "https://v0.test.lemmy/u/alex",
                    banned: false,
                    bot_account: false,
                    deleted: false,
                    id: 1,
                    instance_id: 1,
                    local: true,
                    name: "alex",
                    published: "2026-01-01T00:00:00Z",
                  },
                },
                posts: [],
              }),
              { status: 200 },
            );
          }
        },
      );

      await client.listPersonContent({
        person_id: 1,
        type: "posts",
      });

      expect(capturedUrl).toBeDefined();
      const params = new URLSearchParams(capturedUrl!.split("?")[1]);
      expect(params.get("sort")).toBe("New");
    });
  });

  describe("piefed", () => {
    it("forwards caller's sort to /post/list", async () => {
      let capturedUrl: string | undefined;
      const client = makeMockedClient(
        "v.test.piefed",
        { name: "piefed", version: "1.6" },
        (urlStr) => {
          if (urlStr.includes("/api/alpha/post/list")) {
            capturedUrl = urlStr;
            return new Response(JSON.stringify({ posts: [] }), { status: 200 });
          }
        },
      );

      await client.listPersonContent({
        mode: "piefed",
        person_id: 1,
        // @ts-expect-error piefed's sort enum isn't typed end-to-end here;
        // the test is asserting wire-level forwarding, not type-checking.
        sort: "TopWeek",
        type: "posts",
      });

      expect(capturedUrl).toBeDefined();
      const params = new URLSearchParams(capturedUrl!.split("?")[1]);
      expect(params.get("sort")).toBe("TopWeek");
    });

    it("forwards caller's sort to /comment/list", async () => {
      let capturedUrl: string | undefined;
      const client = makeMockedClient(
        "v.test.piefed",
        { name: "piefed", version: "1.6" },
        (urlStr) => {
          if (urlStr.includes("/api/alpha/comment/list")) {
            capturedUrl = urlStr;
            return new Response(JSON.stringify({ comments: [] }), {
              status: 200,
            });
          }
        },
      );

      await client.listPersonContent({
        mode: "piefed",
        person_id: 1,
        // @ts-expect-error see note above
        sort: "Hot",
        type: "comments",
      });

      expect(capturedUrl).toBeDefined();
      const params = new URLSearchParams(capturedUrl!.split("?")[1]);
      expect(params.get("sort")).toBe("Hot");
    });
  });
});
