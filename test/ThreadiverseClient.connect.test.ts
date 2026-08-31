import { beforeEach, describe, expect, it } from "vitest";

import { FakeLemmyV1Instance } from "../src/testing";
import ThreadiverseClient, { clearCache } from "../src/ThreadiverseClient";
import { setupProviderTest } from "./helpers";

describe("connect() and sync introspection", () => {
  beforeEach(() => {
    clearCache();
  });

  it("resolves mode + software and enables the sync getters", async () => {
    const fake = new FakeLemmyV1Instance();
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    // Not connected yet — sync access must throw loudly
    expect(() => client.capabilities).toThrow("connect()");
    expect(() => client.mode).toThrow("connect()");
    expect(() => client.software).toThrow("connect()");

    expect(await client.connect()).toMatchObject({
      capabilities: {
        getFederatedInstances: false,
        getRandomCommunity: true,
      },
      mode: "lemmyv1",
      software: { name: "lemmy", version: "1.0.0-beta.1" },
    });

    expect(client.capabilities.getFederatedInstances).toBe(false);
    expect(client.mode).toBe("lemmyv1");
    expect(client.software).toEqual({
      name: "lemmy",
      version: "1.0.0-beta.1",
    });
  });

  it("is idempotent and does not re-discover", async () => {
    const fake = new FakeLemmyV1Instance();
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    await client.connect();
    await client.connect();

    expect(fake.calls("GET /.well-known/nodeinfo")).toHaveLength(1);
  });

  it("forwards User-Agent (and not credentials) to discovery requests", async () => {
    const fake = new FakeLemmyV1Instance();
    const client = new ThreadiverseClient(fake.origin, {
      ...fake.clientOptions(),
      headers: {
        Authorization: "Bearer abc",
        "User-Agent": "VoyagerApp/1.0",
      },
    });

    await client.connect();

    for (const matcher of [
      "GET /.well-known/nodeinfo",
      "GET /nodeinfo/2.1",
    ] as const) {
      const [call] = fake.calls(matcher);
      expect(call?.headers).toMatchObject({ "user-agent": "VoyagerApp/1.0" });
      expect(call?.headers).not.toHaveProperty("authorization");
    }
  });

  it("any API call connects implicitly", async () => {
    const fake = new FakeLemmyV1Instance();
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    await client.getPosts({});

    expect(client.mode).toBe("lemmyv1");
  });

  it.each([
    {
      endpoint: "getRandomCommunity",
      mode: "lemmyv0",
      software: { name: "lemmy", version: "0.19.6" },
      supported: false,
    },
    {
      endpoint: "getFederatedInstances",
      mode: "lemmyv1",
      software: { name: "lemmy", version: "1.0.0-beta.1" },
      supported: false,
    },
    {
      endpoint: "listPersonLiked",
      mode: "piefed",
      software: { name: "piefed", version: "1.6.0" },
      supported: false,
    },
    {
      endpoint: "register",
      mode: "piefed",
      software: { name: "piefed", version: "1.6.0" },
      supported: false,
    },
  ] as const)(
    "lets Voyager check $mode $endpoint support before an API call",
    async ({ endpoint, mode, software, supported }) => {
      const baseUrl = `https://${mode}-${endpoint}.example.com`;
      const { client } = setupProviderTest({
        baseUrl,
        nodeinfoHref: `${baseUrl}/nodeinfo/2.1`,
        nodeinfoSoftware: software,
      });

      expect(await client.supports(endpoint)).toBe(supported);
      expect(client.mode).toBe(mode);
      expect(client.capabilities[endpoint]).toBe(supported);
    },
  );

  it("lets Voyager distinguish PieFed upvoted and downvoted feeds", async () => {
    const baseUrl = "https://piefed-voted-feeds.example.com";
    const { client } = setupProviderTest({
      baseUrl,
      nodeinfoHref: `${baseUrl}/nodeinfo/2.1`,
      nodeinfoSoftware: { name: "piefed", version: "1.6.0" },
    });

    await expect(
      client.supports("listPersonLiked", { like_type: "liked_only" }),
    ).resolves.toBe(true);
    await expect(
      client.supports("listPersonLiked", { like_type: "disliked_only" }),
    ).resolves.toBe(false);
    expect(client.capabilities.listPersonLiked).toBe(false);
  });

  it("lets Voyager preflight PieFed's other parameter-level gaps", async () => {
    const baseUrl = "https://piefed-parameter-support.example.com";
    const { client } = setupProviderTest({
      baseUrl,
      nodeinfoHref: `${baseUrl}/nodeinfo/2.1`,
      nodeinfoSoftware: { name: "piefed", version: "1.6.0" },
    });

    await expect(
      client.supports("banFromCommunity", {
        remove_or_restore_data: true,
      }),
    ).resolves.toBe(false);
    await expect(
      client.supports("banFromCommunity", {
        remove_or_restore_data: false,
      }),
    ).resolves.toBe(true);
    await expect(
      client.supports("markNotificationAsRead", { kind: "reply" }),
    ).resolves.toBe(true);
    await expect(
      client.supports("markNotificationAsRead", { kind: "mod_action" }),
    ).resolves.toBe(false);
    await expect(
      client.supports("getNotifications", { type_: "subscribed" }),
    ).resolves.toBe(true);
    await expect(
      client.supports("getNotifications", { type_: "mod_action" }),
    ).resolves.toBe(false);
    await expect(
      client.supports("getNotifications", { type_: "all" }),
    ).resolves.toBe(true);
    await expect(client.supports("getNotifications", {})).resolves.toBe(true);

    expect(client.capabilities.banFromCommunity).toBe(false);
    expect(client.capabilities.getNotifications).toBe(false);
    expect(client.capabilities.markNotificationAsRead).toBe(false);
  });

  it.each([
    {
      mode: "lemmyv0",
      software: { name: "lemmy", version: "0.19.6" },
      tokenless: false,
    },
    {
      mode: "lemmyv1",
      software: { name: "lemmy", version: "1.0.0-beta.1" },
      tokenless: true,
    },
    {
      mode: "piefed",
      software: { name: "piefed", version: "1.6.0" },
      tokenless: true,
    },
  ] as const)(
    "lets Voyager preflight $mode image cleanup with the exact payload",
    async ({ mode, software, tokenless }) => {
      const baseUrl = `https://${mode}-image-cleanup.example.com`;
      const { client } = setupProviderTest({
        baseUrl,
        nodeinfoHref: `${baseUrl}/nodeinfo/2.1`,
        nodeinfoSoftware: software,
      });
      const image = {
        delete_token: "",
        url: `${baseUrl}/media/upload.png`,
      };

      await expect(client.supports("deleteImage", image)).resolves.toBe(
        tokenless,
      );
      await expect(
        client.supports("deleteImage", {
          ...image,
          delete_token: "pictrs-delete-token",
        }),
      ).resolves.toBe(true);
    },
  );
});
