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

    expect(await client.connect()).toEqual({
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
