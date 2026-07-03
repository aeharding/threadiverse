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

  it("rejects account endpoints when nobody is logged in", async () => {
    const { client } = setup();

    await expect(client.getUnreadCount()).rejects.toBeInstanceOf(
      IncorrectLoginError,
    );
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
});
