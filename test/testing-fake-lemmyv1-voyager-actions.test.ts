import { describe, expect, it } from "vitest";

import { IncorrectLoginError } from "../src/errors";
import { FakeLemmyV1Instance } from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

function setup() {
  const fake = new FakeLemmyV1Instance({ host: "voyager-actions.test" });
  const me = fake.seed.person({ id: 1, name: "moderator" });
  const creator = fake.seed.person({ id: 2, name: "poster" });
  const community = fake.seed.community({ id: 3, name: "voyager" });
  const post = fake.seed.post({
    community,
    creator,
    id: 4,
    name: "A post",
  });
  fake.seed.loggedInAs(me);

  const client = new ThreadiverseClient(fake.origin, {
    ...fake.clientOptions(),
    headers: { Authorization: "Bearer test-token" },
  });

  return { client, community, creator, fake, post };
}

describe("FakeLemmyV1Instance Voyager actions", () => {
  it("blocks and unblocks a community through canonical operations", async () => {
    const { client, community, fake } = setup();
    const nextPayload = fake.waitForPayload("blockCommunity");

    const blocked = await client.blockCommunity({
      block: true,
      community_id: community.id,
    });

    const canonicalPayload = { block: true, community_id: community.id };
    expect(await nextPayload).toEqual(canonicalPayload);
    expect(fake.callsTo("blockCommunity")).toEqual([canonicalPayload]);
    expect(fake.calls("POST /api/v4/account/block/community")[0]?.body).toEqual(
      canonicalPayload,
    );
    expect(blocked.community_view.blocked).toBe(true);
    expect(
      (await client.getCommunity({ name: community.name })).community_view
        .blocked,
    ).toBe(true);
    expect(
      (await client.getSite()).my_user?.community_blocks.map(({ id }) => id),
    ).toContain(community.id);

    const unblocked = await client.blockCommunity({
      block: false,
      community_id: community.id,
    });
    expect(unblocked.community_view.blocked).toBe(false);
  });

  it("blocks a person and reflects it on their later post views", async () => {
    const { client, creator, fake, post } = setup();

    await client.blockPerson({ block: true, person_id: creator.id });

    const canonicalPayload = { block: true, person_id: creator.id };
    expect(fake.callsTo("blockPerson")).toEqual([canonicalPayload]);
    expect(fake.calls("POST /api/v4/account/block/person")[0]?.body).toEqual(
      canonicalPayload,
    );
    expect(
      (await client.getPost({ id: post.id })).post_view.creator_blocked,
    ).toBe(true);
    expect(
      (await client.getSite()).my_user?.person_blocks.map(({ id }) => id),
    ).toContain(creator.id);

    await client.blockPerson({ block: false, person_id: creator.id });
    expect(
      (await client.getPost({ id: post.id })).post_view.creator_blocked,
    ).toBe(false);
  });

  it("moderator removal toggles post.removed on immediate and later reads", async () => {
    const { client, fake, post } = setup();

    const removed = await client.removePost({
      post_id: post.id,
      removed: true,
    });

    expect(removed.post_view.post.removed).toBe(true);
    expect(fake.callsTo("removePost")).toEqual([
      { post_id: post.id, removed: true },
    ]);
    expect(fake.calls("POST /api/v4/post/remove")[0]?.body).toEqual({
      post_id: post.id,
      reason: "None",
      removed: true,
    });
    expect((await client.getPost({ id: post.id })).post_view.post.removed).toBe(
      true,
    );

    const restored = await client.removePost({
      post_id: post.id,
      reason: "reviewed",
      removed: false,
    });
    expect(restored.post_view.post.removed).toBe(false);
    expect(fake.callsTo("removePost")[1]).toEqual({
      post_id: post.id,
      reason: "reviewed",
      removed: false,
    });
    expect(fake.calls("POST /api/v4/post/remove")[1]?.body).toEqual({
      post_id: post.id,
      reason: "reviewed",
      removed: false,
    });
  });

  it("logs out through the canonical operation and clears authentication", async () => {
    const { client, fake } = setup();
    const nextPayload = fake.waitForPayload("logout");

    await client.logout();

    expect(await nextPayload).toBeUndefined();
    expect(fake.callsTo("logout")).toEqual([undefined]);
    expect(fake.calls("POST /api/v4/account/auth/logout")[0]?.body).toEqual({});
    expect(fake.seed.loggedInPerson).toBeUndefined();
    await expect(client.getUnreadCount()).rejects.toBeInstanceOf(
      IncorrectLoginError,
    );
  });
});
