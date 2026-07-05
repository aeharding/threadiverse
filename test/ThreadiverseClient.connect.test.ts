import { describe, expect, it } from "vitest";

import { FakeLemmyV1Instance } from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

describe("connect() and sync introspection", () => {
  it("resolves mode + software and enables the sync getters", async () => {
    const fake = new FakeLemmyV1Instance();
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    // Not connected yet — sync access must throw loudly
    expect(() => client.mode).toThrow("connect()");
    expect(() => client.software).toThrow("connect()");

    expect(await client.connect()).toEqual({
      mode: "lemmyv1",
      software: { name: "lemmy", version: "1.0.0-beta.1" },
    });

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
});
