// Round-trip contract test for the PieFed testing package: a real
// ThreadiverseClient (discovery → piefed adapter → compat → SafeClient Zod
// validation) run against FakePiefedInstance. If a builder drifts from what
// the compat layer + canonical schemas expect, this fails here — not in a
// consumer's e2e suite.

import { describe, expect, it } from "vitest";

import { FakePiefedInstance } from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

function setup() {
  const instance = new FakePiefedInstance({ host: "piefed.fake.test" });
  instance.seed.site({ name: "Test piefed site" });

  const alex = instance.build.person({ id: 100, user_name: "alex" });
  const posts = [
    instance.build.postView({ creator: alex, id: 1, title: "First post" }),
    instance.build.postView({ creator: alex, id: 2, title: "Second post" }),
  ];

  instance.mock("GET /api/alpha/post/list", {
    json: instance.build.postListResponse(posts),
  });
  instance.mock("GET /api/alpha/comment/list", {
    json: instance.build.commentListResponse([
      instance.build.commentView({
        body: "A piefed comment",
        id: 5001,
        post: posts[0]!,
      }),
    ]),
  });

  const client = new ThreadiverseClient(
    instance.origin,
    instance.clientOptions(),
  );

  return { alex, client, instance, posts };
}

describe("FakePiefedInstance + ThreadiverseClient round trip", () => {
  it("discovers software via nodeinfo", async () => {
    const { client } = setup();

    expect(await client.connect()).toMatchObject({
      capabilities: {
        getModlog: true,
        listPersonLiked: false,
        register: false,
      },
      mode: "piefed",
      software: { name: "piefed", version: "1.2.0" },
    });
  });

  it("getSite passes canonical validation", async () => {
    const { client } = setup();

    const site = await client.getSite();

    expect(site.site_view.site.name).toBe("Test piefed site");
  });

  it("getPosts returns seeded posts through compat + validation", async () => {
    const { client } = setup();

    const { data } = await client.getPosts({});

    expect(data.map((view) => view.post.name)).toEqual([
      "First post",
      "Second post",
    ]);
    expect(data[0]!.creator.name).toBe("alex");
  });

  it("getComments returns seeded comments through compat + validation", async () => {
    const { client } = setup();

    const { data } = await client.getComments({ post_id: 1 });

    expect(data.map((view) => view.comment.content)).toEqual([
      "A piefed comment",
    ]);
  });

  it("serves a canonical empty modlog by default and records its payload", async () => {
    const { client, instance } = setup();

    const response = await client.getModlog({ community_id: 3 });

    expect(response.data).toEqual([]);
    expect(response.next_page).toBeUndefined();
    expect(instance.calls("GET /api/alpha/modlog")).toHaveLength(1);
    expect(instance.callsTo("getModlog")[0]).toMatchObject({
      community_id: 3,
      // The adapter pins PieFed's native default for exact exhaustion.
      limit: 10,
    });
  });

  it("maps schema-typed modlog overrides through the real adapter", async () => {
    const { client, instance } = setup();
    const moderator = instance.build.person({
      id: 10,
      user_name: "moderator",
    });
    const community = instance.build.community({
      id: 20,
      name: "removed-community",
    });
    instance.on.getModlog({
      json: instance.build.modlogResponse({
        removed_communities: [
          {
            community,
            mod_remove_community: {
              community_id: community.id,
              id: 30,
              mod_person_id: moderator.id,
              reason: "Community deleted",
              removed: true,
              when_: "2026-08-30T12:00:00Z",
            },
            moderator,
          },
        ],
      }),
    });

    const response = await client.getModlog({ community_id: community.id });

    expect(response.data).toEqual([
      expect.objectContaining({
        moderator: expect.objectContaining({ id: moderator.id }),
        modlog: {
          expires_at: undefined,
          id: 30,
          is_revert: false,
          kind: "admin_remove_community",
          published_at: "2026-08-30T12:00:00Z",
          reason: "Community deleted",
        },
        target_community: expect.objectContaining({ id: community.id }),
      }),
    ]);
  });

  it("filters native liked feeds before paginating derived content", async () => {
    const instance = new FakePiefedInstance({ host: "liked.piefed.fake.test" });
    const neutralPost = instance.seed.post({
      id: 1,
      myVote: 0,
      name: "Neutral post",
    });
    instance.seed.post({ id: 2, myVote: 1, name: "First liked post" });
    instance.seed.post({ id: 3, myVote: 1, name: "Second liked post" });
    instance.seed.comment({
      content: "Neutral comment",
      id: 11,
      myVote: 0,
      post: neutralPost,
    });
    instance.seed.comment({
      content: "First liked comment",
      id: 12,
      myVote: 1,
      post: neutralPost,
    });
    instance.seed.comment({
      content: "Second liked comment",
      id: 13,
      myVote: 1,
      post: neutralPost,
    });
    const client = new ThreadiverseClient(
      instance.origin,
      instance.clientOptions(),
    );

    const first = await client.listPersonLiked({
      like_type: "liked_only",
      limit: 1,
    });
    expect(
      first.data
        .map((item) => ("comment" in item ? item.comment.id : item.post.id))
        .sort((a, b) => a - b),
    ).toEqual([2, 12]);
    expect(first.next_page).toBe(2);

    const second = await client.listPersonLiked({
      like_type: "liked_only",
      limit: 1,
      page_cursor: first.next_page,
    });
    expect(
      second.data
        .map((item) => ("comment" in item ? item.comment.id : item.post.id))
        .sort((a, b) => a - b),
    ).toEqual([3, 13]);
    expect(second.next_page).toBe(3);

    const final = await client.listPersonLiked({
      like_type: "liked_only",
      limit: 1,
      page_cursor: second.next_page,
    });
    expect(final).toEqual({ data: [] });
  });

  it("getCommunity and getPersonDetails pass canonical validation", async () => {
    const { alex, client, instance } = setup();

    instance.mock("GET /api/alpha/community", {
      json: instance.build.communityResponse(),
    });
    instance.mock("GET /api/alpha/user", {
      json: instance.build.userResponse(alex),
    });

    const { community_view } = await client.getCommunity({
      name: "test_comm",
    });
    expect(community_view.community.name).toBe("test_comm");

    const { person_view } = await client.getPersonDetails({
      username: "alex",
    });
    expect(person_view.person.name).toBe("alex");
  });

  it("records calls with query for assertions", async () => {
    const { client, instance } = setup();

    await client.getPosts({ limit: 20 });

    const calls = instance.calls("GET /api/alpha/post/list");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.query.get("limit")).toBe("20");
  });
});
