import { describe, expect, it, vi } from "vitest";

import { BaseClientOptions } from "../src/BaseClient";
import { UnsupportedError } from "../src/errors";
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

describe("piefed notification read wire contract", () => {
  it("uses PieFed's mark-all superset route once", async () => {
    const { client, requests } = setup();

    await client.markAllAsRead({});

    expect(requests).toHaveLength(1);
    expect(requests[0]!.method).toBe("POST");
    expect(requests[0]!.url).toBe(
      `${BASE_URL}/api/alpha/user/mark_all_as_read`,
    );
  });

  it("preserves the legacy reply route because its canonical id is a comment-reply id", async () => {
    const { client, requests } = setup();

    await client.markNotificationAsRead({
      kind: "reply",
      notification_id: 41,
      read: false,
    });

    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${BASE_URL}/api/alpha/comment/mark_as_read`);
    await expect(request.json()).resolves.toEqual({
      comment_reply_id: 41,
      read: false,
    });
  });

  it("uses notification_state for generic mention ids", async () => {
    const { client, requests } = setup();

    await client.markNotificationAsRead({
      kind: "mention",
      notification_id: 40,
      read: false,
    });

    const request = requests[0]!;
    expect(request.method).toBe("PUT");
    expect(request.url).toBe(`${BASE_URL}/api/alpha/user/notification_state`);
    await expect(request.json()).resolves.toEqual({
      notif_id: 40,
      read_state: false,
    });
  });

  it("uses notification_state for subscribed notifications and forwards the signal", async () => {
    const { client, requests } = setup();
    const abortController = new AbortController();

    await client.markNotificationAsRead(
      {
        kind: "subscribed",
        notification_id: 42,
        read: true,
      },
      { signal: abortController.signal },
    );

    const request = requests[0]!;
    expect(request.method).toBe("PUT");
    expect(request.url).toBe(`${BASE_URL}/api/alpha/user/notification_state`);
    await expect(request.clone().json()).resolves.toEqual({
      notif_id: 42,
      read_state: true,
    });
    expect(request.signal.aborted).toBe(false);

    abortController.abort();
    expect(request.signal.aborted).toBe(true);
  });

  it("preserves PieFed's dedicated private-message route", async () => {
    const { client, requests } = setup();

    await client.markNotificationAsRead({
      kind: "private_message",
      notification_id: 43,
      read: true,
    });

    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(
      `${BASE_URL}/api/alpha/private_message/mark_as_read`,
    );
    await expect(request.json()).resolves.toEqual({
      private_message_id: 43,
      read: true,
    });
  });

  it("rejects moderation notifications instead of silently succeeding", async () => {
    const { client, requests } = setup();

    await expect(
      client.markNotificationAsRead({
        kind: "mod_action",
        notification_id: 44,
        read: true,
      }),
    ).rejects.toThrow(
      new UnsupportedError(
        "Marking moderation notifications as read is not supported by piefed",
      ),
    );

    expect(requests).toHaveLength(0);
  });
});
