import { describe, expect, it, vi } from "vitest";

import { BaseClientOptions } from "../src/BaseClient";
import { InvalidPayloadError } from "../src/errors";
import { UnsafePiefedClient } from "../src/providers/piefed";

const BASE_URL = "https://piefed.example.com";

function setup() {
  const requests: Request[] = [];
  const fetchFunction = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));

      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    },
  ) as BaseClientOptions["fetchFunction"];

  const client = new UnsafePiefedClient(BASE_URL, {
    fetchFunction,
    headers: {},
  });

  return { client, requests };
}

describe("piefed banFromCommunity wire contract", () => {
  it("maps a temporary ban to PieFed's ban route", async () => {
    const { client, requests } = setup();
    const expiresAt = 1_800_000_000;

    await client.banFromCommunity({
      ban: true,
      community_id: 17,
      expires_at: expiresAt,
      person_id: 42,
      reason: "Repeated spam",
    });

    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${BASE_URL}/api/alpha/community/moderate/ban`);
    await expect(request.json()).resolves.toEqual({
      community_id: 17,
      expires_at: new Date(expiresAt * 1_000).toISOString(),
      permanent: false,
      reason: "Repeated spam",
      user_id: 42,
    });
  });

  it("makes a ban permanent and supplies PieFed's required reason", async () => {
    const { client, requests } = setup();

    await client.banFromCommunity({
      ban: true,
      community_id: 17,
      person_id: 42,
    });

    const request = requests[0]!;
    await expect(request.json()).resolves.toEqual({
      community_id: 17,
      permanent: true,
      reason: "None",
      user_id: 42,
    });
  });

  it("maps unban to PieFed's unban route and forwards the signal", async () => {
    const { client, requests } = setup();
    const abortController = new AbortController();

    await client.banFromCommunity(
      {
        ban: false,
        community_id: 17,
        expires_at: 1_800_000_000,
        person_id: 42,
        reason: "Ignored when unbanning",
      },
      { signal: abortController.signal },
    );

    const request = requests[0]!;
    expect(request.method).toBe("PUT");
    expect(request.url).toBe(`${BASE_URL}/api/alpha/community/moderate/unban`);
    await expect(request.clone().json()).resolves.toEqual({
      community_id: 17,
      user_id: 42,
    });
    expect(request.signal.aborted).toBe(false);

    abortController.abort();
    expect(request.signal.aborted).toBe(true);
  });

  it.each([true, false])(
    "rejects unsupported content %s rather than silently changing moderator intent",
    async (ban) => {
      const { client, requests } = setup();

      await expect(
        client.banFromCommunity({
          ban,
          community_id: 17,
          person_id: 42,
          remove_or_restore_data: true,
        }),
      ).rejects.toBeInstanceOf(InvalidPayloadError);

      expect(requests).toHaveLength(0);
    },
  );
});
