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
// unmocked (requests record before the 404 rejects) — errors are swallowed.
const SCENARIOS = [
  {
    expected: { is_upvote: true, post_id: 42 },
    invoke: (c: ThreadiverseClient) =>
      c.likePost({ is_upvote: true, post_id: 42 }),
    operation: "likePost",
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
    expected: { limit: 5, post_id: 42 },
    invoke: (c: ThreadiverseClient) => c.getComments({ limit: 5, post_id: 42 }),
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
    expected: { q: "https://example.com/post/1" },
    invoke: (c: ThreadiverseClient) =>
      c.resolveObject({ q: "https://example.com/post/1" }),
    operation: "resolveObject",
  },
] as const;

const V1_ONLY_SCENARIOS = [
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
    expected: { unread_only: true },
    invoke: (c: ThreadiverseClient) =>
      c.getNotifications({ unread_only: true }),
    operation: "getNotifications",
  },
  {
    expected: { person_id: 100 },
    invoke: (c: ThreadiverseClient) => c.listPersonContent({ person_id: 100 }),
    operation: "listPersonContent",
  },
] as const;

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

      const payloads = fake.callsTo(operation);
      expect(payloads).toHaveLength(1);
      expect(payloads[0]).toMatchObject(expected);
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
      expect(payloads[0]).toMatchObject(expected);
    },
  );
});
