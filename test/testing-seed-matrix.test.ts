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

  it("paginates derived feeds with the provider's own cursor model", async () => {
    const { client, fake } = setup();

    fake.seed.clear();
    const alex = fake.seed.person({ name: "alex" });
    fake.seed.loggedInAs(alex);
    for (const index of [1, 2, 3, 4, 5])
      fake.seed.post({ creator: alex, id: index, name: `Post ${index}` });

    const first = await client.getPosts({ limit: 2 });
    expect(first.data.map((view) => view.post.name)).toEqual([
      "Post 1",
      "Post 2",
    ]);
    expect(first.next_page).toBeDefined();

    // Feed the cursor back exactly as the app would
    const second = await client.getPosts({
      limit: 2,
      page_cursor: first.next_page,
    } as Parameters<typeof client.getPosts>[0]);
    expect(second.data.map((view) => view.post.name)).toEqual([
      "Post 3",
      "Post 4",
    ]);

    const third = await client.getPosts({
      limit: 2,
      page_cursor: second.next_page,
    } as Parameters<typeof client.getPosts>[0]);
    expect(third.data.map((view) => view.post.name)).toEqual(["Post 5"]);

    // End of feed means the same thing on every provider: no cursor
    expect(third.next_page).toBeUndefined();
  });

  it("marks posts read, and later reads reflect it", async () => {
    const { client, fake, post } = setup();
    fake.seed.loggedInAs(fake.seed.person({ name: "me" }));

    expect((await client.getPost({ id: post.id })).post_view.read).toBe(false);

    await client.markPostAsRead({ post_ids: [post.id], read: true });

    expect((await client.getPost({ id: post.id })).post_view.read).toBe(true);
  });

  it("serves a trailing empty page when the last page was full", async () => {
    const { client, fake } = setup();

    fake.seed.clear();
    const alex = fake.seed.person({ name: "alex" });
    for (const index of [1, 2])
      fake.seed.post({ creator: alex, id: index, name: `Post ${index}` });

    // Exactly `limit` items: real servers still hand out a cursor, and the
    // page behind it is empty — consumers that stop on "no cursor" must
    // survive that extra round trip
    const first = await client.getPosts({ limit: 2 });
    expect(first.data).toHaveLength(2);
    expect(first.next_page).toBeDefined();

    const second = await client.getPosts({
      limit: 2,
      page_cursor: first.next_page,
    } as Parameters<typeof client.getPosts>[0]);
    expect(second.data).toHaveLength(0);
  });

  it("honors max_depth relative to the requested parent", async () => {
    const { client, fake, post } = setup();

    // parent → child → grandchild, all on the seeded post
    const parent = fake.seed.comment({ content: "parent", id: 20, post });
    fake.seed.comment({
      content: "child",
      id: 21,
      path: `0.${parent.id}.21`,
      post,
    });
    fake.seed.comment({
      content: "grandchild",
      id: 22,
      path: `0.${parent.id}.21.22`,
      post,
    });

    // Shallowest depth = top-level only. The providers count differently
    // without a parent (verified against live servers): Lemmy counts from
    // the post, PieFed counts levels below top-level.
    const shallow = await client.getComments({
      max_depth: mode === "piefed" ? 0 : 1,
      post_id: post.id,
    });
    expect(shallow.data.map((view) => view.comment.content)).toEqual([
      "First!",
      "parent",
    ]);

    // The excluded descendants still count toward child_count — which is
    // what makes a consumer's "N more replies" affordance render
    const shallowParent = shallow.data.find(
      (view) => view.comment.content === "parent",
    );
    expect(shallowParent?.comment.child_count).toBe(2);

    // Depth 1 from the parent = the parent plus its direct children
    const subtree = await client.getComments({
      max_depth: 1,
      parent_id: parent.id,
      post_id: post.id,
    });
    expect(subtree.data.map((view) => view.comment.content)).toEqual([
      "parent",
      "child",
    ]);
  });

  it("derives search results from seeded content", async () => {
    const { client, fake } = setup();

    fake.seed.community({ name: "cats_only", title: "Cats Only" });
    fake.seed.person({ name: "catlover" });

    const posts = await client.search({
      search_term: "hello",
      type_: "posts",
    });
    expect(
      posts.data.map((item) => ("post" in item ? item.post.name : "?")),
    ).toEqual(["Hello **world**"]);

    // Type filtering keeps other buckets out
    const communities = await client.search({
      search_term: "cats",
      type_: "communities",
    });
    expect(
      communities.data.map((item) =>
        "community" in item && !("post" in item) ? item.community.name : "?",
      ),
    ).toEqual(["cats", "cats_only"]);

    const users = await client.search({ search_term: "cat", type_: "users" });
    expect(
      users.data.map((item) => ("person" in item ? item.person.name : "?")),
    ).toEqual(["catlover"]);

    // A term nothing matches yields an empty result set, not an error
    const none = await client.search({ search_term: "zzzz", type_: "posts" });
    expect(none.data).toHaveLength(0);
  });

  it("searches every type at once", async () => {
    const { client, fake } = setup();

    fake.seed.community({ name: "cats_only", title: "Cats Only" });
    fake.seed.person({ name: "catlover" });
    fake.seed.comment({ content: "cats are great" });

    // PieFed's API has no all-type search, so the adapter fans out and
    // merges — the canonical result matches Lemmy's single request
    const { data } = await client.search({ search_term: "cat" });

    const kinds = data.map((item) => {
      switch (true) {
        case "comment" in item:
          return "comment";
        case "post" in item:
          return "post";
        case "community" in item:
          return "community";
        default:
          return "person";
      }
    });

    expect(new Set(kinds)).toEqual(
      new Set(["comment", "community", "person", "post"]),
    );
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

describe("lemmyv1 cursors", () => {
  it("hands out cursors a consumer cannot derive", async () => {
    // Real Lemmy cursors are opaque tokens. If the fake's encoded its own
    // offset, a consumer that ignored the server's cursor and computed one
    // would still page correctly — and its tests would pass. (PieFed is
    // exempt: page numbers genuinely are its API.)
    const fake = new FakeLemmyV1Instance();
    const alex = fake.seed.person({ name: "alex" });
    for (const index of [1, 2, 3, 4])
      fake.seed.post({ creator: alex, id: index, name: `Post ${index}` });

    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    const first = await client.getPosts({ limit: 2 });
    expect(String(first.next_page)).not.toContain("2");

    const second = await client.getPosts({
      limit: 2,
      page_cursor: first.next_page,
    });
    expect(second.data.map((view) => view.post.name)).toEqual([
      "Post 3",
      "Post 4",
    ]);
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
