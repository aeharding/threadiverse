import { describe, expect, it } from "vitest";

import {
  UnexpectedResponseError,
  UnsupportedSoftwareError,
} from "../src/errors";
import LemmyV0Client from "../src/providers/lemmyv0";
import LemmyV1Client from "../src/providers/lemmyv1";
import PiefedClient from "../src/providers/piefed";
import buildSafeClient from "../src/SafeClient";
import { FakeLemmyV1Instance } from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

describe("safe response contract", () => {
  class MalformedClient {
    async getPosts() {
      return 42;
    }
  }

  const SafeMalformedClient = buildSafeClient(
    MalformedClient as unknown as Parameters<typeof buildSafeClient>[0],
  );

  it("wraps Zod failures in UnexpectedResponseError and preserves the cause", async () => {
    const client = new SafeMalformedClient("https://example.com", {});

    try {
      await client.getPosts({});
      throw new Error("Expected getPosts to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(UnexpectedResponseError);
      expect(error).toMatchObject({
        cause: expect.objectContaining({ issues: expect.any(Array) }),
        message: "Malformed getPosts response",
      });
    }
  });
});

describe("provider version resolution", () => {
  it("selects v0 only for pre-1.0 Lemmy releases", () => {
    expect(
      ThreadiverseClient.resolveClient({ name: "lemmy", version: "0.19.0" }),
    ).toBe(LemmyV0Client);
    expect(
      ThreadiverseClient.resolveClient({ name: "lemmy", version: "0.20.0" }),
    ).toBe(LemmyV0Client);
  });

  it("does not fall back to v0 for unsupported v1 prereleases or 2.x", () => {
    expect(
      ThreadiverseClient.resolveClient({
        name: "lemmy",
        version: "1.0.0-alpha.4",
      }),
    ).toBeUndefined();
    expect(
      ThreadiverseClient.resolveClient({ name: "lemmy", version: "2.0.0" }),
    ).toBeUndefined();
  });

  it("selects v1 from its first supported prerelease", () => {
    expect(
      ThreadiverseClient.resolveClient({
        name: "lemmy",
        version: "1.0.0-alpha.5",
      }),
    ).toBe(LemmyV1Client);
  });

  it("accepts non-semver versions for wildcard providers", () => {
    expect(
      ThreadiverseClient.resolveClient({ name: "piefed", version: "dev" }),
    ).toBe(PiefedClient);
  });

  it("normalizes malformed versions to UnsupportedSoftwareError", () => {
    expect(() =>
      ThreadiverseClient.resolveClient({
        name: "lemmy",
        version: "definitely-not-semver",
      }),
    ).toThrow(UnsupportedSoftwareError);
  });
});

describe("Lemmy v1 auth detection", () => {
  it("recognizes a lowercase authorization header", async () => {
    const fake = new FakeLemmyV1Instance();
    const me = fake.seed.person({ name: "me" });
    fake.seed.loggedInAs(me);

    const client = new LemmyV1Client(fake.origin, {
      ...fake.clientOptions(),
      headers: { authorization: "Bearer test" },
    });

    const site = await client.getSite();

    expect(site.my_user?.local_user_view.person.name).toBe("me");
    expect(fake.calls("GET /api/v4/account")).toHaveLength(1);
  });
});
