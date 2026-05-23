// Regression: voyager sends `{ post_id, score: 1|-1|0 }` (v0 convention) but
// v1 expects `{ post_id, is_upvote?: true|false|undefined }`. If the v1
// adapter spreads `score` blindly, the server silently ignores it and the
// user's vote disappears on refresh. Verify both shape conversion and the
// "clear vote" case (score=0 → is_upvote omitted entirely).

import { describe, expect, it, vi } from "vitest";

import { BaseClientOptions } from "../src/BaseClient";
import ThreadiverseClient from "../src/ThreadiverseClient";

const HOST = "https://v1.test.lemmy";

function makeClient(captureBody: (body: unknown) => void) {
  const options: BaseClientOptions = {
    fetchFunction: mockV1Fetch(captureBody),
    headers: {},
  };
  return new ThreadiverseClient(HOST, options);
}

function mockV1Fetch(captureBody: (body: unknown) => void) {
  return vi.fn(async (url: unknown, init?: RequestInit) => {
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
              href: `${HOST}/nodeinfo/2.1`,
              rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
            },
          ],
        }),
        { status: 200 },
      );
    }
    if (urlStr === `${HOST}/nodeinfo/2.1`) {
      return new Response(
        JSON.stringify({
          software: { name: "lemmy", version: "1.0.0-beta.1" },
        }),
        { status: 200 },
      );
    }
    if (urlStr.endsWith("/api/v4/post/like")) {
      captureBody(JSON.parse(init!.body as string));
      // Return a minimally-valid post_view shape so the response doesn't
      // crash the compat layer.
      return new Response(
        JSON.stringify({
          post_view: {
            can_mod: false,
            community: {
              ap_id: `${HOST}/c/c`,
              comments: 0,
              deleted: false,
              id: 1,
              instance_id: 1,
              last_refreshed_at: "2026-05-21T12:00:00Z",
              local: true,
              local_removed: false,
              name: "c",
              nsfw: false,
              posting_restricted_to_mods: false,
              posts: 0,
              published_at: "2026-05-21T12:00:00Z",
              removed: false,
              report_count: 0,
              subscribers: 0,
              subscribers_local: 0,
              title: "c",
              unresolved_report_count: 0,
              users_active_day: 0,
              users_active_half_year: 0,
              users_active_month: 0,
              users_active_week: 0,
              visibility: "public",
            },
            creator: {
              ap_id: `${HOST}/u/alex`,
              banned: false,
              bot_account: false,
              comment_count: 0,
              deleted: false,
              id: 1,
              instance_id: 1,
              local: true,
              name: "alex",
              post_count: 0,
              published_at: "2026-05-21T12:00:00Z",
            },
            creator_banned: false,
            creator_banned_from_community: false,
            creator_is_admin: false,
            creator_is_moderator: false,
            post: {
              ap_id: `${HOST}/post/1`,
              comments: 0,
              community_id: 1,
              creator_id: 1,
              deleted: false,
              downvotes: 0,
              featured_community: false,
              featured_local: false,
              federation_pending: false,
              id: 1,
              language_id: 0,
              local: true,
              locked: false,
              name: "p",
              nsfw: false,
              published_at: "2026-05-21T12:00:00Z",
              removed: false,
              report_count: 0,
              score: 0,
              unresolved_report_count: 0,
              upvotes: 0,
            },
            tags: [],
          },
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected fetch: ${urlStr}`);
  });
}

describe("v1 likePost - wire payload", () => {
  it("is_upvote: true is forwarded as-is", async () => {
    let body: unknown;
    const client = makeClient((b) => (body = b));
    await client.likePost({ is_upvote: true, post_id: 1 });
    expect(body).toEqual({ is_upvote: true, post_id: 1 });
  });

  it("is_upvote: false is forwarded as-is", async () => {
    let body: unknown;
    const client = makeClient((b) => (body = b));
    await client.likePost({ is_upvote: false, post_id: 1 });
    expect(body).toEqual({ is_upvote: false, post_id: 1 });
  });

  it("is_upvote omitted (undefined) clears the vote", async () => {
    let body: unknown;
    const client = makeClient((b) => (body = b));
    await client.likePost({ is_upvote: undefined, post_id: 1 });
    // JSON.stringify drops undefined, so the wire body has no is_upvote key
    // at all — which is how v1 distinguishes "clear vote" from up/downvote.
    expect(body).toEqual({ post_id: 1 });
  });
});
