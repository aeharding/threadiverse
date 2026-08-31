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

type MatrixFake = FakeLemmyV1Instance | FakePiefedInstance;

function getCommentCalls(fake: MatrixFake) {
  if (fake instanceof FakeLemmyV1Instance) return fake.callsTo("getComments");
  return fake.callsTo("getComments");
}

function getPostCalls(fake: MatrixFake) {
  if (fake instanceof FakeLemmyV1Instance) return fake.callsTo("getPosts");
  return fake.callsTo("getPosts");
}

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

  it("resolves Voyager's numeric community and person identifiers", async () => {
    const { alex, cats, client, fake } = setup();
    const communityPayload =
      fake instanceof FakeLemmyV1Instance
        ? fake.waitForNextPayload("getCommunity")
        : fake.waitForNextPayload("getCommunity");
    const personPayload =
      fake instanceof FakeLemmyV1Instance
        ? fake.waitForNextPayload("getPersonDetails")
        : fake.waitForNextPayload("getPersonDetails");

    const [{ community_view }, { person_view }] = await Promise.all([
      client.getCommunity({ id: cats.id }),
      client.getPersonDetails({ person_id: alex.id }),
    ]);

    expect(community_view.community.id).toBe(cats.id);
    expect(person_view.person.id).toBe(alex.id);
    await expect(communityPayload).resolves.toEqual({ id: cats.id });
    await expect(personPayload).resolves.toEqual({ person_id: alex.id });

    const communityCalls =
      fake instanceof FakeLemmyV1Instance
        ? fake.callsTo("getCommunity")
        : fake.callsTo("getCommunity");
    const personCalls =
      fake instanceof FakeLemmyV1Instance
        ? fake.callsTo("getPersonDetails")
        : fake.callsTo("getPersonDetails");
    expect(communityCalls).toEqual([{ id: cats.id }]);
    expect(personCalls).toEqual([{ person_id: alex.id }]);
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

    const payloads = getPostCalls(fake);
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

  it("returns no comments when asked for zero levels", async () => {
    const { client, post } = setup();

    const { data } = await client.getComments({
      max_depth: 0,
      post_id: post.id,
    });

    expect(data).toEqual([]);
  });

  it("asks for the same comment depth regardless of provider", async () => {
    const { client, fake, post } = setup();

    await client.getComments({ max_depth: 3, post_id: post.id });

    // Canonical payloads stay canonical even where the wire request had to
    // be adjusted for the provider
    const calls = getCommentCalls(fake);
    expect(calls[0]).toMatchObject({ max_depth: 3 });
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

    // max_depth means the same thing on every provider: the piefed adapter
    // absorbs that server's different base (see toPiefedMaxDepth)
    const shallow = await client.getComments({
      max_depth: 1,
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

describe("piefed saved content", () => {
  it("requires an authenticated user for saved_only profile requests", async () => {
    const fake = new FakePiefedInstance();
    const person = fake.seed.person({ name: "alex" });
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    await expect(
      client.listPersonSaved({ limit: 1, person_id: person.id }),
    ).rejects.toBeInstanceOf(IncorrectLoginError);
  });

  it("pages seeded saved posts and comments independently like PieFed", async () => {
    const fake = new FakePiefedInstance();
    const me = fake.seed.person({ id: 1, name: "me" });
    const creator = fake.seed.person({ id: 2, name: "creator" });
    fake.seed.loggedInAs(me);

    const firstPost = fake.seed.post({
      creator,
      id: 10,
      name: "Saved post one",
      saved: true,
    });
    const secondPost = fake.seed.post({
      creator,
      id: 11,
      name: "Saved post two",
      saved: true,
    });
    const unsavedPost = fake.seed.post({
      creator,
      id: 12,
      name: "Not saved",
    });
    fake.seed.comment({
      content: "Saved comment one",
      creator,
      id: 20,
      post: firstPost,
      saved: true,
    });
    fake.seed.comment({
      content: "Saved comment two",
      creator,
      id: 21,
      post: secondPost,
      saved: true,
    });
    fake.seed.comment({
      content: "Not saved",
      creator,
      id: 22,
      post: unsavedPost,
    });

    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());
    const itemIds = (
      items: Awaited<ReturnType<typeof client.listPersonSaved>>["data"],
    ) =>
      items.map((item) =>
        "comment" in item
          ? `comment:${item.comment.id}`
          : `post:${item.post.id}`,
      );

    const first = await client.listPersonSaved({
      limit: 1,
      person_id: me.id,
    });
    expect(new Set(itemIds(first.data))).toEqual(
      new Set(["comment:20", "post:10"]),
    );
    expect(first.next_page).toBe(2);

    const second = await client.listPersonSaved({
      limit: 1,
      page_cursor: first.next_page,
      person_id: me.id,
    });
    expect(new Set(itemIds(second.data))).toEqual(
      new Set(["comment:21", "post:11"]),
    );
    expect(second.next_page).toBe(3);

    const third = await client.listPersonSaved({
      limit: 1,
      page_cursor: second.next_page,
      person_id: me.id,
    });
    expect(third.data).toEqual([]);
    expect(third.next_page).toBeUndefined();

    expect(
      fake
        .calls("GET /api/alpha/user")
        .map((call) => Object.fromEntries(call.query)),
    ).toEqual([
      { limit: "1", person_id: "1", saved_only: "true" },
      { limit: "1", page: "2", person_id: "1", saved_only: "true" },
      { limit: "1", page: "3", person_id: "1", saved_only: "true" },
    ]);
  });
});

describe("piefed report defaults", () => {
  it("serves authenticated empty report lists with the requested filters", async () => {
    const fake = new FakePiefedInstance();
    fake.seed.loggedInAs(fake.seed.person({ name: "moderator" }));
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    const response = await client.listReports({
      community_id: 9,
      limit: 3,
      unresolved_only: true,
    });

    expect(response.data).toEqual([]);
    expect(response.next_page).toBeUndefined();
    const expectedQuery = {
      community_id: "9",
      limit: "3",
      page: "1",
      unresolved_only: "true",
    };
    expect(
      fake
        .calls("GET /api/alpha/comment/report/list")
        .map((call) => Object.fromEntries(call.query)),
    ).toEqual([expectedQuery]);
    expect(
      fake
        .calls("GET /api/alpha/post/report/list")
        .map((call) => Object.fromEntries(call.query)),
    ).toEqual([expectedQuery]);
  });

  it("auth-gates report lists and returns not-found for unseeded resolves", async () => {
    const fake = new FakePiefedInstance();
    const moderator = fake.seed.person({ name: "moderator" });
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    await expect(client.listReports({ limit: 1 })).rejects.toBeInstanceOf(
      IncorrectLoginError,
    );
    await expect(
      client.resolveCommentReport({ report_id: 17, resolved: true }),
    ).rejects.toBeInstanceOf(IncorrectLoginError);
    await expect(
      client.resolvePostReport({ report_id: 18, resolved: false }),
    ).rejects.toBeInstanceOf(IncorrectLoginError);

    fake.seed.loggedInAs(moderator);
    await expect(
      client.resolveCommentReport({ report_id: 17, resolved: true }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      client.resolvePostReport({ report_id: 18, resolved: false }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("allows report resolve overrides while recording canonical payloads", async () => {
    const fake = new FakePiefedInstance();
    fake.seed.loggedInAs(fake.seed.person({ name: "moderator" }));
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());
    const commentPayload = { report_id: 17, resolved: true };
    const postPayload = { report_id: 18, resolved: false };
    const nextComment = fake.waitForNextPayload("resolveCommentReport");
    const nextPost = fake.waitForNextPayload("resolvePostReport");
    fake.on.resolveCommentReport({ json: {} });
    fake.on.resolvePostReport({ json: {} });

    await Promise.all([
      client.resolveCommentReport(commentPayload),
      client.resolvePostReport(postPayload),
    ]);

    await expect(nextComment).resolves.toEqual(commentPayload);
    await expect(nextPost).resolves.toEqual(postPayload);
    expect(fake.callsTo("resolveCommentReport")).toEqual([commentPayload]);
    expect(fake.callsTo("resolvePostReport")).toEqual([postPayload]);
  });
});

describe("lemmyv1 person content", () => {
  it("resolves usernames and filters posts or comments by canonical type", async () => {
    const fake = new FakeLemmyV1Instance();
    const alex = fake.seed.person({ name: "alex" });
    const bob = fake.seed.person({ name: "bob" });
    const alexPost = fake.seed.post({ creator: alex, name: "Alex post" });
    fake.seed.post({ creator: bob, name: "Bob post" });
    fake.seed.comment({
      content: "Alex comment",
      creator: alex,
      post: alexPost,
    });
    fake.seed.comment({
      content: "Bob comment",
      creator: bob,
      post: alexPost,
    });
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    const posts = await client.listPersonContent({
      mode: "lemmyv1",
      type: "posts",
      username: "alex@remote.example",
    });
    expect(
      posts.data.flatMap((item) => ("comment" in item ? [] : [item.post.name])),
    ).toEqual(["Alex post"]);

    const comments = await client.listPersonContent({
      mode: "lemmyv1",
      type: "comments",
      username: "alex@remote.example",
    });
    expect(
      comments.data.flatMap((item) =>
        "comment" in item ? [item.comment.content] : [],
      ),
    ).toEqual(["Alex comment"]);
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
  it("preserves Voyager's notification cursor and kind for request assertions", async () => {
    const fake = new FakeLemmyV1Instance();
    fake.seed.loggedInAs(fake.seed.person({ name: "alex" }));
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());
    const payload = {
      limit: 25,
      page_cursor: "voyager-inbox-cursor",
      type_: "subscribed" as const,
      unread_only: true,
    };
    const nextPayload = fake.waitForNextPayload("getNotifications");

    await expect(client.getNotifications(payload)).resolves.toEqual({
      data: [],
    });

    await expect(nextPayload).resolves.toEqual(payload);
    expect(fake.callsTo("getNotifications")).toEqual([payload]);
  });

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
