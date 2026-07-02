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

  const client = new ThreadiverseClient(
    instance.origin,
    instance.clientOptions(),
  );

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

  it("getNotifications passes canonical validation (incl. null id fields)", async () => {
    const { alex, client, instance, posts } = setup();

    const other = instance.build.person({ id: 200, name: "other" });

    instance.mock("GET /api/v4/account/notification/list", {
      json: instance.build.pagedResponse([
        instance.build.commentNotification({
          comment: instance.build.commentView({
            content: "someone replied",
            creator: other,
            id: 31,
            post: posts[0]!,
          }),
          id: 301,
          kind: "reply",
          recipient_id: alex.id,
        }),
        instance.build.privateMessageNotification({
          id: 303,
          message: instance.build.privateMessageView({
            content: "psst",
            creator: other,
            id: 41,
            recipient: alex,
          }),
        }),
      ]),
    });

    const { data } = await client.getNotifications({});

    expect(data.map((view) => view.notification.kind)).toEqual([
      "reply",
      "private_message",
    ]);
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

  it("records and allows overriding discovery routes", async () => {
    const { client, instance } = setup();

    instance.mock("GET /.well-known/nodeinfo", { abort: "failed" });

    await expect(client.getPosts({})).rejects.toThrow(TypeError);
    expect(instance.calls("GET /.well-known/nodeinfo")).toHaveLength(1);
  });

  it("isolates same-host instances via clientOptions()", async () => {
    const first = new FakeLemmyV1Instance();
    const second = new FakeLemmyV1Instance({ version: "1.2.0" });

    const firstClient = new ThreadiverseClient(
      first.origin,
      first.clientOptions(),
    );
    const secondClient = new ThreadiverseClient(
      second.origin,
      second.clientOptions(),
    );

    expect((await firstClient.getSoftware()).version).toBe("1.0.0-beta.1");
    expect((await secondClient.getSoftware()).version).toBe("1.2.0");
  });

  it("serves null-body statuses through the fetch adapter", async () => {
    const { instance } = setup();

    instance.mock("POST /api/v4/post/mark_as_read", {
      json: null,
      status: 204,
    });

    const response = await instance.fetch(
      `${instance.origin}/api/v4/post/mark_as_read`,
      { method: "POST" },
    );

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it("waitForCall resolves for an in-flight request without polling", async () => {
    const { client, instance } = setup();

    const pendingCall = instance.waitForCall("GET /api/v4/post/list");
    await client.getPosts({ limit: 5 });

    const call = await pendingCall;
    expect(call.query.get("limit")).toBe("5");
  });

  it("rejects waitForCall (not the request) when a predicate throws", async () => {
    const { client, instance } = setup();

    const pending = instance.waitForCall("GET /api/v4/post/list", () => {
      throw new Error("bad predicate");
    });

    // The request under test must be unaffected by the waiter's bug
    await expect(client.getPosts({})).resolves.toBeTruthy();
    await expect(pending).rejects.toThrow("bad predicate");
  });
});
