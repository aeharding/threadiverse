// The provider-matrix contract: one semantic seed scenario, asserted
// through a real ThreadiverseClient against every fake. Also covers the
// operation layer (on/once/callsTo) including canonical error injection —
// the same spec text works for every provider because operations are named
// after threadiverse endpoints, not routes.

import { describe, expect, it } from "vitest";

import {
  IncorrectLoginError,
  NotFoundError,
  RateLimitedError,
} from "../src/errors";
import {
  FakeLemmyV1Instance,
  FakePiefedInstance,
  SeedStore,
} from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

function seedScenario(seed: SeedStore) {
  const alex = seed.person({ displayName: "Alex", name: "alex" });
  const cats = seed.community({ name: "cats", title: "Cats" });
  const post = seed.post({
    body: "look at this **cat**",
    community: cats,
    creator: alex,
    name: "Hello **world**",
  });
  seed.comment({ content: "First!", post });
  seed.site({ name: "Fake instance" });

  return { alex, cats, post };
}

describe.each([
  ["lemmyv1", () => new FakeLemmyV1Instance()],
  ["piefed", () => new FakePiefedInstance()],
] as const)("%s", (mode, makeFake) => {
  function setup() {
    const fake = makeFake();
    const scenario = seedScenario(fake.seed);
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());
    return { client, fake, ...scenario };
  }

  it("serves one seeded scenario consistently across endpoints", async () => {
    const { client, post } = setup();

    expect((await client.connect()).mode).toBe(mode);

    const site = await client.getSite();
    expect(site.site_view.site.name).toBe("Fake instance");

    const { data: posts } = await client.getPosts({});
    expect(posts.map((view) => view.post.name)).toEqual(["Hello **world**"]);
    expect(posts[0]!.community.name).toBe("cats");
    expect(posts[0]!.creator.name).toBe("alex");

    const { post_view } = await client.getPost({ id: post.id });
    expect(post_view.post.name).toBe("Hello **world**");

    const { data: comments } = await client.getComments({ post_id: post.id });
    expect(comments.map((view) => view.comment.content)).toEqual(["First!"]);

    const { community_view } = await client.getCommunity({ name: "cats" });
    expect(community_view.community.title).toBe("Cats");

    const { person_view } = await client.getPersonDetails({
      username: "alex",
    });
    expect(person_view.person.name).toBe("alex");
  });

  it("injects canonical errors that surface as condition classes", async () => {
    const { client, fake } = setup();

    fake.on.getSite({ error: { code: "rate_limit_error", status: 429 } });

    await expect(client.getSite()).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("once() overrides a single response, then falls back to seed", async () => {
    const { client, fake } = setup();

    fake.once.getPosts({ error: { code: "not_found", status: 404 } });

    await expect(client.getPosts({})).rejects.toBeInstanceOf(NotFoundError);

    const { data } = await client.getPosts({});
    expect(data).toHaveLength(1);
  });

  it("records canonical payloads by operation name", async () => {
    const { client, fake } = setup();

    await client.getPosts({ limit: 7 });

    const payloads = fake.callsTo("getPosts");
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({ limit: 7 });
  });

  it("derives create/edit/delete write responses", async () => {
    const { cats, client, fake, post } = setup();
    fake.seed.loggedInAs(fake.seed.person({ id: 100, name: "me" }));

    // Create a post → returned view + subsequent feed reflect it
    const created = await client.createPost({
      body: "fresh body",
      community_id: cats.id,
      name: "Fresh post",
    });
    expect(created.post_view.post.name).toBe("Fresh post");
    expect(created.post_view.creator.name).toBe("me");
    const { data: feed } = await client.getPosts({});
    expect(feed.map((view) => view.post.name)).toContain("Fresh post");

    // Edit the created post
    const edited = await client.editPost({
      name: "Edited post",
      post_id: created.post_view.post.id,
    });
    expect(edited.post_view.post.name).toBe("Edited post");

    // Delete it
    const removed = await client.deletePost({
      deleted: true,
      post_id: created.post_view.post.id,
    });
    expect(removed.post_view.post.deleted).toBe(true);

    // Create a comment → appears under the post
    const comment = await client.createComment({
      content: "a new reply",
      post_id: post.id,
    });
    expect(comment.comment_view.comment.content).toBe("a new reply");
    const { data: comments } = await client.getComments({ post_id: post.id });
    expect(comments.map((view) => view.comment.content)).toContain(
      "a new reply",
    );

    // Edit + delete the comment
    const editedComment = await client.editComment({
      comment_id: comment.comment_view.comment.id,
      content: "edited reply",
    });
    expect(editedComment.comment_view.comment.content).toBe("edited reply");
    const deletedComment = await client.deleteComment({
      comment_id: comment.comment_view.comment.id,
      deleted: true,
    });
    expect(deletedComment.comment_view.comment.deleted).toBe(true);
  });

  it("derives vote/save state from write mutations", async () => {
    const { client, fake, post } = setup();
    fake.seed.loggedInAs(fake.seed.person({ name: "me" }));

    // Seeded post starts unvoted at base score 1
    const before = await client.getPost({ id: post.id });
    expect(before.post_view.my_vote ?? 0).toBe(0);
    expect(before.post_view.post.score).toBe(1);

    // Upvote → returned view and subsequent reads reflect it
    const liked = await client.likePost({ is_upvote: true, post_id: post.id });
    expect(liked.post_view.my_vote).toBe(1);
    expect(liked.post_view.post.score).toBe(2);

    const { data: feed } = await client.getPosts({});
    expect(feed[0]!.my_vote).toBe(1);
    expect(feed[0]!.post.score).toBe(2);

    // Unvote returns to base
    await client.likePost({ post_id: post.id });
    expect((await client.getPost({ id: post.id })).post_view.post.score).toBe(
      1,
    );

    // Save
    const saved = await client.savePost({ post_id: post.id, save: true });
    expect(saved.post_view.saved).toBe(true);
    expect((await client.getPost({ id: post.id })).post_view.saved).toBe(true);

    // Comments mutate the same way
    const comment = fake.seed.comment({ content: "hi", post });
    const cLiked = await client.likeComment({
      comment_id: comment.id,
      is_upvote: true,
    });
    expect(cLiked.comment_view.my_vote).toBe(1);
    expect(cLiked.comment_view.comment.score).toBe(2);

    const cSaved = await client.saveComment({
      comment_id: comment.id,
      save: true,
    });
    expect(cSaved.comment_view.saved).toBe(true);
    const { data: comments } = await client.getComments({ post_id: post.id });
    const reread = comments.find((view) => view.comment.id === comment.id);
    expect(reread?.saved).toBe(true);
    expect(reread?.my_vote).toBe(1);
  });

  it("rejects account endpoints when nobody is logged in", async () => {
    const { client } = setup();

    await expect(client.getUnreadCount()).rejects.toBeInstanceOf(
      IncorrectLoginError,
    );
  });

  it("filters comment subtrees by parent_id", async () => {
    const { client, fake, post } = setup();

    // A small tree on the seeded post: parent with one child, plus an
    // unrelated top-level comment
    const parent = fake.seed.comment({ content: "parent", id: 20, post });
    fake.seed.comment({
      content: "child",
      id: 21,
      path: `0.${parent.id}.21`,
      post,
    });
    fake.seed.comment({ content: "unrelated", id: 22, post });

    const { data } = await client.getComments({
      parent_id: parent.id,
      post_id: post.id,
    });
    expect(data.map((view) => view.comment.content).sort()).toEqual([
      "child",
      "parent",
    ]);
  });

  it("seed.clear() empties the derived feed", async () => {
    const { client, fake } = setup();

    fake.seed.clear();

    const { data } = await client.getPosts({});
    expect(data).toHaveLength(0);
  });

  it("derives the inbox from seeded notifications", async () => {
    const { client, fake, post } = setup();
    const seed = fake.seed;

    const me = seed.person({ name: "me" });
    const other = seed.person({ name: "other" });
    seed.loggedInAs(me);

    seed.reply({
      comment: seed.comment({ content: "a reply", creator: other, post }),
      id: 301,
    });
    seed.mention({
      comment: seed.comment({ content: "a mention", creator: other, post }),
      id: 302,
      read: true,
    });
    seed.privateMessage({ content: "psst", creator: other });

    const { data } = await client.getNotifications({});
    expect(data.map((view) => view.notification.kind).sort()).toEqual([
      "mention",
      "private_message",
      "reply",
    ]);

    const { data: unreadOnly } = await client.getNotifications({
      unread_only: true,
    });
    expect(unreadOnly.map((view) => view.notification.kind).sort()).toEqual([
      "private_message",
      "reply",
    ]);

    // Marking read mutates seed state on every provider
    await client.markNotificationAsRead({
      kind: "reply",
      notification_id: 301,
      read: true,
    });
    const { data: afterRead } = await client.getNotifications({
      unread_only: true,
    });
    expect(afterRead.map((view) => view.notification.kind)).toEqual([
      "private_message",
    ]);

    // markAllAsRead clears the rest on every provider
    await client.markAllAsRead();
    const { data: afterAll } = await client.getNotifications({
      unread_only: true,
    });
    expect(afterAll).toHaveLength(0);
  });

  it("includes the logged-in user in getSite", async () => {
    const { fake } = setup();

    const me = fake.seed.person({ name: "me" });
    fake.seed.loggedInAs(me);

    // A logged-in client carries auth; lemmyv1 only fetches my_user when
    // authed, piefed always reads it from the site response
    const client = new ThreadiverseClient(fake.origin, {
      ...fake.clientOptions(),
      headers: { Authorization: "Bearer test" },
    });

    const site = await client.getSite();
    expect(site.my_user?.local_user_view.person.name).toBe("me");
  });

  it("listPersonContent only returns the person's content", async () => {
    const { alex, client, fake, post } = setup();

    const bob = fake.seed.person({ name: "bob" });
    fake.seed.post({ creator: bob, name: "Bob's post" });
    fake.seed.comment({ content: "bob's comment", creator: bob, post });

    const { data } = await client.listPersonContent({ person_id: alex.id });

    const names = data.map((item) =>
      "post" in item && !("comment" in item)
        ? item.post.name
        : "comment" in item
          ? item.comment.content
          : "?",
    );
    expect(names).toContain("Hello **world**");
    expect(names).not.toContain("Bob's post");
    expect(names).not.toContain("bob's comment");
  });
});

describe("seeded notifications (lemmyv1)", () => {
  it("derives inbox endpoints from seeded notifications", async () => {
    const fake = new FakeLemmyV1Instance();
    const seed = fake.seed;

    const alex = seed.person({ name: "alex" });
    const other = seed.person({ name: "other" });
    seed.loggedInAs(alex);

    const post = seed.post({ creator: alex, name: "A post" });
    const reply = seed.comment({
      content: "replying to you",
      creator: other,
      post,
    });
    seed.reply({ comment: reply });
    seed.privateMessage({ content: "psst", creator: other, read: true });

    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    // v1 reports one combined notification_count; the adapter maps it to
    // canonical `replies`
    const unread = await client.getUnreadCount();
    expect(unread.replies).toBe(1);

    const { data } = await client.getNotifications({});
    expect(data.map((view) => view.notification.kind)).toEqual([
      "reply",
      "private_message",
    ]);

    const { data: unreadOnly } = await client.getNotifications({
      unread_only: true,
    });
    expect(unreadOnly.map((view) => view.notification.kind)).toEqual(["reply"]);
  });

  it("mark-as-read writes mutate derived seed state", async () => {
    const fake = new FakeLemmyV1Instance();
    const seed = fake.seed;

    const alex = seed.person({ name: "alex" });
    const other = seed.person({ name: "other" });
    seed.loggedInAs(alex);

    const reply = seed.reply({
      comment: seed.comment({ content: "hi", creator: other }),
      id: 301,
    });
    seed.privateMessage({
      content: "psst",
      creator: other,
      notificationId: 302,
    });

    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    expect((await client.getUnreadCount()).replies).toBe(2);

    await client.markNotificationAsRead({
      kind: "reply",
      notification_id: reply.id,
      read: true,
    });
    expect((await client.getUnreadCount()).replies).toBe(1);
    expect(fake.callsTo("markNotificationAsRead")[0]).toEqual({
      notification_id: 301,
      read: true,
    });

    await client.markAllAsRead();
    expect((await client.getUnreadCount()).replies).toBe(0);
  });
});
