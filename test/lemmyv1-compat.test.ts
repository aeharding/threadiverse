// Regression coverage for v1 compat conversions against the real wire shape
// (which uses JSON `null`, not omitted fields, for absent values).

import { describe, expect, it } from "vitest";

import {
  toCommentView,
  toPostView,
  toSupportedNotificationView,
} from "../src/providers/lemmyv1/compat";

const NOW = "2026-05-21T12:00:00.000Z";

// Subset of v1's Comment with the fields toCommentView reads (it spreads `v`
// and only overrides a few). The compat function doesn't validate shape, so
// extra fields don't matter.
function baseCommentView() {
  return {
    can_mod: false,
    comment: { content: "", id: 1 } as never,
    community: { id: 1, name: "c" } as never,
    creator: { id: 1, name: "alex" } as never,
    creator_banned: false,
    creator_banned_from_community: false,
    creator_is_admin: false,
    creator_is_moderator: false,
    post: { id: 1, name: "p" } as never,
    tags: [] as never,
  };
}

function basePostView() {
  return {
    can_mod: false,
    community: { id: 1, name: "c" } as never,
    creator: { id: 1, name: "alex" } as never,
    creator_banned: false,
    creator_banned_from_community: false,
    creator_is_admin: false,
    creator_is_moderator: false,
    post: { comments: 0, id: 1, name: "p" } as never,
    tags: [] as never,
  };
}

describe("v1 compat - my_vote derivation", () => {
  it("CommentView: no comment_actions → no vote", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = toCommentView({ ...baseCommentView() } as any);
    expect(v.my_vote).toBeUndefined();
  });

  it("CommentView: comment_actions with null vote_is_upvote → no vote", () => {
    // Real wire shape: server returns JSON `null` (not omitted) when the user
    // has merely read/saved but not voted. Before this regression's fix, the
    // null fell through the ternary to `-1` — phantom downvote.
    const v = toCommentView({
      ...baseCommentView(),
      comment_actions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        saved_at: null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vote_is_upvote: null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        voted_at: null as any,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(v.my_vote).toBeUndefined();
  });

  it("CommentView: vote_is_upvote=true → upvote", () => {
    const v = toCommentView({
      ...baseCommentView(),
      comment_actions: { vote_is_upvote: true, voted_at: NOW },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(v.my_vote).toBe(1);
  });

  it("CommentView: vote_is_upvote=false → downvote", () => {
    const v = toCommentView({
      ...baseCommentView(),
      comment_actions: { vote_is_upvote: false, voted_at: NOW },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(v.my_vote).toBe(-1);
  });

  it("PostView: post_actions with null vote_is_upvote (after read) → no vote", () => {
    const v = toPostView({
      ...basePostView(),
      post_actions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hidden_at: null as any,
        read_at: NOW,
        read_comments_amount: 1,
        read_comments_at: NOW,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        saved_at: null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vote_is_upvote: null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        voted_at: null as any,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(v.my_vote).toBeUndefined();
  });

  it("PostView: surfaces read_comments_at from post_actions", () => {
    const v = toPostView({
      ...basePostView(),
      post_actions: {
        read_comments_amount: 1,
        read_comments_at: NOW,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(v.read_comments_at).toBe(NOW);
  });

  it("PostView: read_comments_at null/absent → undefined", () => {
    const nulled = toPostView({
      ...basePostView(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      post_actions: { read_comments_at: null as any },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    expect(nulled.read_comments_at).toBeUndefined();

    const absent = toPostView(basePostView() as never);
    expect(absent.read_comments_at).toBeUndefined();
  });
});

describe("v1 compat - toSupportedNotificationView normalizes null id fields", () => {
  // v1's wire response for /account/notification/list returns the *_id
  // fields that don't apply (e.g. `modlog_id` for a reply notification) as
  // JSON `null`, not omitted. Threadiverse's `Notification` schema uses
  // `z.optional(z.number())` which accepts only `undefined`; without
  // normalizing in compat, `SafeClient` rejects the entire response.
  it("converts null modlog_id/private_message_id to undefined", () => {
    const view = toSupportedNotificationView({
      data: {
        comment: {
          ap_id: "https://example/comment/1",
          child_count: 0,
          content: "hi",
          creator_id: 1,
          deleted: false,
          distinguished: false,
          downvotes: 0,
          id: 1,
          language_id: 0,
          local: true,
          path: "0.1",
          post_id: 1,
          published_at: NOW,
          removed: false,
          score: 1,
          upvotes: 1,
        },
        community: { id: 1, name: "c" },
        creator: { id: 1, name: "alex" },
        post: { id: 1, name: "p" },
        type_: "comment",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      notification: {
        comment_id: 1,
        creator_id: 0,
        id: 79,
        kind: "reply",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        modlog_id: null as any,
        post_id: 16,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private_message_id: null as any,
        published_at: NOW,
        read: false,
        recipient_id: 1,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(view).toBeDefined();
    expect(view!.notification.modlog_id).toBeUndefined();
    expect(view!.notification.private_message_id).toBeUndefined();
    // Defined ids stay numeric
    expect(view!.notification.comment_id).toBe(1);
    expect(view!.notification.post_id).toBe(16);
  });
});
