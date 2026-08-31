// Request-decoder round trip: call the real ThreadiverseClient with a
// canonical payload, then assert the fake decoded the wire request back to
// that same payload. This pins the decoders to the adapters — consumer
// tests can assert on `callsTo()`/`waitForPayload()` payloads knowing they
// mean exactly what the app passed to threadiverse, on every provider.

import { describe, expect, it } from "vitest";

import { FakeLemmyV1Instance, FakePiefedInstance } from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

// Each scenario: invoke the canonical operation, then expect the decoded
// payload to contain exactly these canonical fields. Responses are mostly
// unmocked (requests record before the 501 rejects) — errors are swallowed.
const SCENARIOS = [
  {
    expected: { is_upvote: true, post_id: 42 },
    invoke: (c: ThreadiverseClient) =>
      c.likePost({ is_upvote: true, post_id: 42 }),
    operation: "likePost",
  },
  {
    // Unvote: is_upvote omitted must survive the round trip
    expected: { post_id: 42 },
    invoke: (c: ThreadiverseClient) => c.likePost({ post_id: 42 }),
    operation: "likePost",
  },
  {
    expected: { limit: 7, type_: "moderator_view" },
    invoke: (c: ThreadiverseClient) =>
      c.getPosts({ limit: 7, type_: "moderator_view" }),
    operation: "getPosts",
  },
  {
    expected: { comment_id: 7, is_upvote: false },
    invoke: (c: ThreadiverseClient) =>
      c.likeComment({ comment_id: 7, is_upvote: false }),
    operation: "likeComment",
  },
  {
    expected: { post_id: 42, save: true },
    invoke: (c: ThreadiverseClient) => c.savePost({ post_id: 42, save: true }),
    operation: "savePost",
  },
  {
    expected: { comment_id: 7, save: true },
    invoke: (c: ThreadiverseClient) =>
      c.saveComment({ comment_id: 7, save: true }),
    operation: "saveComment",
  },
  {
    expected: { deleted: true, post_id: 42 },
    invoke: (c: ThreadiverseClient) =>
      c.deletePost({ deleted: true, post_id: 42 }),
    operation: "deletePost",
  },
  {
    expected: { comment_id: 7, deleted: true },
    invoke: (c: ThreadiverseClient) =>
      c.deleteComment({ comment_id: 7, deleted: true }),
    operation: "deleteComment",
  },
  {
    expected: { community_id: 9, follow: true },
    invoke: (c: ThreadiverseClient) =>
      c.followCommunity({ community_id: 9, follow: true }),
    operation: "followCommunity",
  },
  {
    expected: { content: "hello **world**", post_id: 42 },
    invoke: (c: ThreadiverseClient) =>
      c.createComment({ content: "hello **world**", post_id: 42 }),
    operation: "createComment",
  },
  {
    expected: { community_id: 9, name: "A post title" },
    invoke: (c: ThreadiverseClient) =>
      c.createPost({ community_id: 9, name: "A post title" }),
    operation: "createPost",
  },
  {
    expected: { content: "psst", recipient_id: 5 },
    invoke: (c: ThreadiverseClient) =>
      c.createPrivateMessage({ content: "psst", recipient_id: 5 }),
    operation: "createPrivateMessage",
  },
  {
    expected: { post_ids: [1, 2], read: true },
    invoke: (c: ThreadiverseClient) =>
      c.markPostAsRead({ post_ids: [1, 2], read: true }),
    operation: "markPostAsRead",
  },
  {
    expected: { password: "hunter2", username_or_email: "alex" },
    invoke: (c: ThreadiverseClient) =>
      c.login({ password: "hunter2", username_or_email: "alex" }),
    operation: "login",
  },
  {
    expected: { limit: 7, type_: "local" },
    invoke: (c: ThreadiverseClient) => c.getPosts({ limit: 7, type_: "local" }),
    operation: "getPosts",
  },
  {
    expected: { limit: 5, parent_id: 7, post_id: 42 },
    invoke: (c: ThreadiverseClient) =>
      c.getComments({ limit: 5, parent_id: 7, post_id: 42 }),
    operation: "getComments",
  },
  {
    // No parent: piefed's wire depth is adjusted, so the decoder has to
    // undo it to report what the caller asked for
    expected: { max_depth: 3, post_id: 42 },
    invoke: (c: ThreadiverseClient) =>
      c.getComments({ max_depth: 3, post_id: 42 }),
    operation: "getComments",
  },
  {
    // With a parent the providers agree, so depth passes through untouched
    expected: { max_depth: 2, parent_id: 7, post_id: 42 },
    invoke: (c: ThreadiverseClient) =>
      c.getComments({ max_depth: 2, parent_id: 7, post_id: 42 }),
    operation: "getComments",
  },
  {
    expected: { search_term: "cats", type_: "communities" },
    invoke: (c: ThreadiverseClient) =>
      c.search({ search_term: "cats", type_: "communities" }),
    operation: "search",
  },
  {
    expected: { username: "alex" },
    invoke: (c: ThreadiverseClient) => c.getPersonDetails({ username: "alex" }),
    operation: "getPersonDetails",
  },
  {
    expected: { id: 42 },
    invoke: (c: ThreadiverseClient) => c.getPost({ id: 42 }),
    operation: "getPost",
  },
  {
    expected: { name: "cats" },
    invoke: (c: ThreadiverseClient) => c.getCommunity({ name: "cats" }),
    operation: "getCommunity",
  },
  {
    expected: {
      comment_id: 7,
      community_id: 8,
      limit: 9,
      mod_person_id: 10,
      other_person_id: 11,
      post_id: 12,
    },
    invoke: (c: ThreadiverseClient) =>
      c.getModlog({
        comment_id: 7,
        community_id: 8,
        limit: 9,
        mod_person_id: 10,
        other_person_id: 11,
        post_id: 12,
      }),
    operation: "getModlog",
  },
  {
    expected: { q: "https://example.com/post/1" },
    invoke: (c: ThreadiverseClient) =>
      c.resolveObject({ q: "https://example.com/post/1" }),
    operation: "resolveObject",
  },
] as const;

const V1_ONLY_SCENARIOS = [
  {
    expected: { page_cursor: "abc123", sort: "hot" },
    invoke: (c: ThreadiverseClient) =>
      c.getPosts({ mode: "lemmyv1", page_cursor: "abc123", sort: "hot" }),
    operation: "getPosts",
  },
  {
    expected: { notification_id: 3, read: true },
    invoke: (c: ThreadiverseClient) =>
      c.markNotificationAsRead({
        kind: "reply",
        notification_id: 3,
        read: true,
      }),
    operation: "markNotificationAsRead",
  },
  {
    expected: {
      limit: 25,
      page_cursor: "voyager-inbox-cursor",
      type_: "subscribed",
      unread_only: true,
    },
    invoke: (c: ThreadiverseClient) =>
      c.getNotifications({
        limit: 25,
        page_cursor: "voyager-inbox-cursor",
        type_: "subscribed",
        unread_only: true,
      }),
    operation: "getNotifications",
  },
  {
    expected: {
      limit: 7,
      page_cursor: "person-page",
      type: "comments",
      username: "alex@example.com",
    },
    invoke: (c: ThreadiverseClient) =>
      c.listPersonContent({
        limit: 7,
        mode: "lemmyv1",
        page_cursor: "person-page",
        type: "comments",
        username: "alex@example.com",
      }),
    operation: "listPersonContent",
  },
] as const;

const PIEFED_SINGLE_ROUTE_SCENARIOS = [
  {
    expected: { comment_id: 7, distinguished: true },
    invoke: (c: ThreadiverseClient) =>
      c.distinguishComment({ comment_id: 7, distinguished: true }),
    operation: "distinguishComment",
  },
  {
    // PieFed identifies an upload by URL; the canonical delete token has no
    // wire equivalent and is intentionally absent from the decoded payload.
    expected: { url: "https://example.com/image.png" },
    invoke: (c: ThreadiverseClient) =>
      c.deleteImage({
        delete_token: "voyager-delete-token",
        url: "https://example.com/image.png",
      }),
    operation: "deleteImage",
  },
  {
    expected: { community_id: 8, mode: "all_posts" },
    invoke: (c: ThreadiverseClient) =>
      c.editCommunityNotifications({ community_id: 8, mode: "all_posts" }),
    operation: "editCommunityNotifications",
  },
  {
    expected: { community_id: 8, mode: "replies_and_mentions" },
    invoke: (c: ThreadiverseClient) =>
      c.editCommunityNotifications({
        community_id: 8,
        mode: "replies_and_mentions",
      }),
    operation: "editCommunityNotifications",
  },
  {
    expected: { mode: "all_comments", post_id: 42 },
    invoke: (c: ThreadiverseClient) =>
      c.editPostNotifications({ mode: "all_comments", post_id: 42 }),
    operation: "editPostNotifications",
  },
  {
    expected: { mode: "replies_and_mentions", post_id: 42 },
    invoke: (c: ThreadiverseClient) =>
      c.editPostNotifications({
        mode: "replies_and_mentions",
        post_id: 42,
      }),
    operation: "editPostNotifications",
  },
  {
    expected: { url: "https://example.com/article" },
    invoke: (c: ThreadiverseClient) =>
      c.getSiteMetadata({ url: "https://example.com/article" }),
    operation: "getSiteMetadata",
  },
  {
    expected: { report_id: 17, resolved: true },
    invoke: (c: ThreadiverseClient) =>
      c.resolveCommentReport({ report_id: 17, resolved: true }),
    operation: "resolveCommentReport",
  },
  {
    expected: { report_id: 18, resolved: false },
    invoke: (c: ThreadiverseClient) =>
      c.resolvePostReport({ report_id: 18, resolved: false }),
    operation: "resolvePostReport",
  },
] as const;

const PIEFED_ONLY_SCENARIOS = [
  {
    expected: {
      comment_id: 7,
      community_id: 8,
      limit: 9,
      mod_person_id: 10,
      other_person_id: 11,
      page_cursor: 2,
      post_id: 12,
    },
    invoke: (c: ThreadiverseClient) =>
      c.getModlog({
        comment_id: 7,
        community_id: 8,
        limit: 9,
        mod_person_id: 10,
        other_person_id: 11,
        page_cursor: 2,
        post_id: 12,
      }),
    operation: "getModlog",
  },
  ...PIEFED_SINGLE_ROUTE_SCENARIOS,
] as const;

type CommonScenarioOperation = (typeof SCENARIOS)[number]["operation"];

/**
 * Both fakes decode every operation in the shared scenario table, while each
 * retains a provider-specific operation map for the rest of its API.
 */
function callsToCommonOperation(
  fake: FakeLemmyV1Instance | FakePiefedInstance,
  operation: CommonScenarioOperation,
) {
  if (fake instanceof FakeLemmyV1Instance) return fake.callsTo(operation);
  return fake.callsTo(operation);
}

async function swallow(promise: Promise<unknown>) {
  try {
    await promise;
  } catch {
    // Unmocked responses reject — the request was still recorded first
  }
}

describe.each([
  ["lemmyv1", () => new FakeLemmyV1Instance()],
  ["piefed", () => new FakePiefedInstance()],
] as const)("%s request decoders", (mode, makeFake) => {
  it.each(SCENARIOS)(
    "$operation round-trips its canonical payload",
    async ({ expected, invoke, operation }) => {
      const fake = makeFake();
      const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

      await swallow(invoke(client));

      const payloads = callsToCommonOperation(fake, operation);
      expect(payloads).toHaveLength(1);
      expect(payloads[0]).toEqual(expected);
    },
  );

  it("mode sanity", async () => {
    const fake = makeFake();
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());
    expect((await client.connect()).mode).toBe(mode);
  });
});

describe("lemmyv1-only request decoders", () => {
  it.each(V1_ONLY_SCENARIOS)(
    "$operation round-trips its canonical payload",
    async ({ expected, invoke, operation }) => {
      const fake = new FakeLemmyV1Instance();
      const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

      await swallow(invoke(client));

      const payloads = fake.callsTo(operation);
      expect(payloads).toHaveLength(1);
      expect(payloads[0]).toEqual(expected);
    },
  );
});

describe("piefed-only request decoders", () => {
  it.each(PIEFED_ONLY_SCENARIOS)(
    "$operation round-trips its canonical payload",
    async ({ expected, invoke, operation }) => {
      const fake = new FakePiefedInstance();
      const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

      await swallow(invoke(client));

      const payloads = fake.callsTo(operation);
      expect(payloads).toHaveLength(1);
      expect(payloads[0]).toEqual(expected);
    },
  );

  it.each(PIEFED_SINGLE_ROUTE_SCENARIOS)(
    "$operation resolves its canonical payload waiter",
    async ({ expected, invoke, operation }) => {
      const fake = new FakePiefedInstance();
      const client = new ThreadiverseClient(fake.origin, fake.clientOptions());
      const nextPayload = fake.waitForNextPayload(operation);

      await swallow(invoke(client));

      await expect(nextPayload).resolves.toEqual(expected);
      expect(fake.callsTo(operation)).toEqual([expected]);
    },
  );
});
