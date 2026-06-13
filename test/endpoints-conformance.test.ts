// Table-driven conformance: every endpoint declared in src/endpoints.ts must
// exist on every provider (unsafe + safe) and on ThreadiverseClient, and
// SafeClient must actually validate (or deliberately pass through) each
// endpoint's response. Grows automatically as rows are added to the table.

import { describe, expect, it } from "vitest";

import { endpoints } from "../src/endpoints";
import LemmyV0Client, { UnsafeLemmyV0Client } from "../src/providers/lemmyv0";
import LemmyV1Client, { UnsafeLemmyV1Client } from "../src/providers/lemmyv1";
import PiefedClient, { UnsafePiefedClient } from "../src/providers/piefed";
import buildSafeClient from "../src/SafeClient";
import ThreadiverseClient from "../src/ThreadiverseClient";

const endpointNames = Object.keys(endpoints) as (keyof typeof endpoints)[];

describe("endpoint table conformance", () => {
  describe.each([
    ["lemmyv0", UnsafeLemmyV0Client, LemmyV0Client],
    ["lemmyv1", UnsafeLemmyV1Client, LemmyV1Client],
    ["piefed", UnsafePiefedClient, PiefedClient],
  ] as const)("%s", (_mode, UnsafeClient, SafeClient) => {
    it.each(endpointNames)("implements %s", (endpoint) => {
      expect(typeof UnsafeClient.prototype[endpoint]).toBe("function");
      expect(typeof SafeClient.prototype[endpoint]).toBe("function");
    });
  });

  it.each(endpointNames)("ThreadiverseClient delegates %s", (endpoint) => {
    expect(typeof ThreadiverseClient.prototype[endpoint]).toBe("function");
  });
});

describe("SafeClient response validation", () => {
  // A provider that resolves every endpoint with a value no response schema
  // accepts. Proves each schema'd endpoint is actually wired through
  // validation — a regression here means responses silently bypass Zod.
  const GARBAGE = 42 as const;

  class GarbageClient {}

  // Methods must live on the prototype, where SafeClient looks them up
  for (const endpoint of endpointNames) {
    (GarbageClient.prototype as unknown as Record<string, unknown>)[endpoint] =
      async () => GARBAGE;
  }

  const SafeGarbageClient = buildSafeClient(
    GarbageClient as unknown as Parameters<typeof buildSafeClient>[0],
  );
  const client = new SafeGarbageClient("https://example.com", {});

  for (const endpoint of endpointNames) {
    const schema = endpoints[endpoint];

    if (schema) {
      it(`rejects malformed ${endpoint} response`, async () => {
        await expect(
          (client[endpoint] as () => Promise<unknown>)(),
        ).rejects.toThrow();
      });
    } else {
      it(`passes through ${endpoint} response (no schema)`, async () => {
        await expect(
          (client[endpoint] as () => Promise<unknown>)(),
        ).resolves.toBe(GARBAGE);
      });
    }
  }
});
