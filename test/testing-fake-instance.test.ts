// Round-trip contract test for the testing package: a real
// ThreadiverseClient (discovery → v1 adapter → compat → SafeClient Zod
// validation) run against FakeLemmyV1Instance via its fetch adapter. If a
// builder drifts from what the compat layer + canonical schemas expect,
// this fails here — not in a consumer's e2e suite.

import { describe, expect, it } from "vitest";

import { FakeLemmyV1Instance } from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

function setup() {
  const instance = new FakeLemmyV1Instance({ host: "v1.fake.test" });

  const alex = instance.build.person({ id: 100, name: "alex" });
  const posts = [
    instance.build.postView({ creator: alex, id: 1, name: "First post" }),
    instance.build.postView({ creator: alex, id: 2, name: "Second post" }),
  ];

  instance.mock("GET /api/v4/post/list", {
    json: instance.build.pagedResponse(posts),
  });
  instance.mock("GET /api/v4/comment/list", {
    json: instance.build.pagedResponse([
      instance.build.commentView({
        content: "A comment",
        id: 5001,
        post: posts[0]!,
      }),
    ]),
  });

  const client = new ThreadiverseClient(instance.origin, {
    discoveryCache: new Map(),
    fetchFunction: instance.fetch,
  });

  return { alex, client, instance, posts };
}

describe("FakeLemmyV1Instance + ThreadiverseClient round trip", () => {
  it("discovers software via nodeinfo", async () => {
    const { client } = setup();

    expect(await client.getMode()).toBe("lemmyv1");
    expect(await client.getSoftware()).toEqual({
      name: "lemmy",
      version: "1.0.0-beta.1",
    });
  });

  it("getSite passes canonical validation", async () => {
    const { client } = setup();

    const site = await client.getSite();

    expect(site.site_view.site.name).toBe("Test v1 site");
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

    expect(data.map((view) => view.comment.content)).toEqual(["A comment"]);
  });

  it("getCommunity and getPersonDetails pass canonical validation", async () => {
    const { alex, client, instance } = setup();

    instance.mock("GET /api/v4/community", {
      json: instance.build.communityResponse(),
    });
    instance.mock("GET /api/v4/person", {
      json: instance.build.personResponse(alex),
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

    const calls = instance.calls("GET /api/v4/post/list");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.query.get("limit")).toBe("20");
  });

  it("mock() overrides defaults and exposes the request body", async () => {
    const { client, instance, posts } = setup();

    instance.mock("POST /api/v4/post/like", (call) => ({
      json: { post_view: posts[0] },
      status: call.body && typeof call.body === "object" ? 200 : 400,
    }));

    const { post_view } = await client.likePost({
      is_upvote: true,
      post_id: 1,
    });
    expect(post_view.post.id).toBe(1);

    const call = await instance.waitForCall("POST /api/v4/post/like");
    expect(call.body).toMatchObject({ post_id: 1 });
  });

  it("answers unmocked endpoints with a 404 error", async () => {
    const { client } = setup();

    await expect(client.getUnreadCount()).rejects.toThrow();
  });

  it("simulates aborts as network failures", async () => {
    const { client, instance } = setup();

    instance.mock("GET /api/v4/post/list", { abort: "failed" });

    await expect(client.getPosts({})).rejects.toThrow(TypeError);
  });
});
