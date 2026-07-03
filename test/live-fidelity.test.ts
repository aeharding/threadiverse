// Error-response fidelity: the fakes must fail the same way real instances
// do. Each scenario runs against a live instance AND the corresponding fake
// through a real ThreadiverseClient, then asserts both surface the same
// error condition class and a compatible status. A mismatch means the fake
// (or a missing code mapping in src/errors.ts) has drifted from reality.
//
// Read-only and deterministic. Gated like live-smoke:
//
//   LIVE_SMOKE=1 pnpm vitest run test/live-fidelity.test.ts
//
// Note the lemmy comparison is deliberately cross-version (lemmy.world runs
// v0; the fake is v1): condition classes are the invariant that must hold
// across versions even when the raw codes differ (couldnt_find_* vs
// not_found).

import { describe, expect, it } from "vitest";

import { ResponseError } from "../src/errors";
import {
  FakeInstance,
  FakeLemmyV1Instance,
  FakePiefedInstance,
} from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

const OPTIONS = { retry: 2, timeout: 30_000 };

const SCENARIOS = [
  {
    name: "nonexistent community",
    run: (client: ThreadiverseClient) =>
      client.getCommunity({ name: "definitely_not_real_xyz123" }),
  },
  {
    name: "nonexistent user",
    run: (client: ThreadiverseClient) =>
      client.getPersonDetails({ username: "definitely_not_real_xyz123" }),
  },
  {
    name: "unauthenticated unread count",
    run: (client: ThreadiverseClient) => client.getUnreadCount(),
  },
] as const;

const INSTANCES: { makeFake: () => FakeInstance; realUrl: string }[] = [
  { makeFake: () => new FakeLemmyV1Instance(), realUrl: "https://lemmy.world" },
  {
    makeFake: () => new FakePiefedInstance(),
    realUrl: "https://piefed.social",
  },
];

async function captureError(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error) return error;
    throw new Error(`Non-Error thrown: ${String(error)}`, { cause: error });
  }
  throw new Error("Expected the scenario to reject, but it resolved");
}

describe.runIf(process.env.LIVE_SMOKE)("error fidelity", () => {
  describe.each(INSTANCES)("$realUrl", ({ makeFake, realUrl }) => {
    it.each(SCENARIOS)("$name", OPTIONS, async ({ run }) => {
      const realClient = new ThreadiverseClient(realUrl, {
        discoveryCache: new Map(),
      });

      const fake = makeFake();
      const fakeClient = new ThreadiverseClient(
        fake.origin,
        fake.clientOptions(),
      );

      const [realError, fakeError] = await Promise.all([
        captureError(run(realClient)),
        captureError(run(fakeClient)),
      ]);

      // The contract: identical condition class — instanceof checks written
      // against the fake behave identically against the real instance
      expect(fakeError.constructor.name).toBe(realError.constructor.name);
      expect(realError).toBeInstanceOf(ResponseError);
      expect(fakeError).toBeInstanceOf(ResponseError);

      // Status parity where the provider reports it (lemmy v0 doesn't)
      const realStatus = (realError as ResponseError).status;
      if (realStatus !== undefined)
        expect((fakeError as ResponseError).status).toBe(realStatus);
    });
  });
});
