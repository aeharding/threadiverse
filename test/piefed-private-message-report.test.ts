import { describe, expect, it, vi } from "vitest";

import type { BaseClientOptions } from "../src/BaseClient";

import { ResponseError } from "../src/errors";
import { UnsafePiefedClient } from "../src/providers/piefed";
import { FakePiefedInstance } from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

const BASE_URL = "https://piefed.example.com";

function setup(response: Response = Response.json({})) {
  const requests: Request[] = [];
  const fetchFunction = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return response;
    },
  ) as BaseClientOptions["fetchFunction"];

  const client = new UnsafePiefedClient(BASE_URL, {
    fetchFunction,
    headers: {
      Authorization: "Bearer test-token",
      "X-Not-Allowed": "must-not-leak",
    },
  });

  return { client, requests };
}

describe("piefed createPrivateMessageReport wire contract", () => {
  it("sends the exact canonical report to PieFed's private-message route", async () => {
    const { client, requests } = setup();
    const controller = new AbortController();

    await expect(
      client.createPrivateMessageReport(
        {
          private_message_id: 42,
          reason: "Spam or abuse",
        },
        { signal: controller.signal },
      ),
    ).resolves.toBeUndefined();

    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${BASE_URL}/api/alpha/private_message/report`);
    expect(request.headers.get("authorization")).toBe("Bearer test-token");
    expect(request.headers.get("x-not-allowed")).toBeNull();
    await expect(request.clone().json()).resolves.toEqual({
      private_message_id: 42,
      reason: "Spam or abuse",
    });

    expect(request.signal.aborted).toBe(false);
    controller.abort();
    expect(request.signal.aborted).toBe(true);
  });

  it("surfaces PieFed report failures without changing their meaning", async () => {
    const { client } = setup(
      Response.json(
        { message: "couldnt_create_report" },
        { status: 400, statusText: "Bad Request" },
      ),
    );

    const error = await client
      .createPrivateMessageReport({
        private_message_id: 42,
        reason: "Already reported",
      })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ResponseError);
    expect(error).toMatchObject({
      code: "couldnt_create_report",
      software: "piefed",
      status: 400,
    });
  });
});

describe("FakePiefedInstance createPrivateMessageReport", () => {
  it("records the canonical payload for a seeded private message", async () => {
    const fake = new FakePiefedInstance({ host: "reports.piefed.test" });
    const me = fake.seed.person({ id: 7, name: "voyager" });
    const sender = fake.seed.person({ id: 8, name: "spammer" });
    fake.seed.loggedInAs(me);
    const message = fake.seed.privateMessage({
      content: "Unwanted message",
      creator: sender,
      id: 42,
      recipient: me,
    });
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    await expect(
      client.createPrivateMessageReport({
        private_message_id: message.id,
        reason: "Spam or abuse",
      }),
    ).resolves.toBeUndefined();

    expect(client.capabilities.createPrivateMessageReport).toBe(true);
    expect(fake.callsTo("createPrivateMessageReport")).toEqual([
      { private_message_id: 42, reason: "Spam or abuse" },
    ]);
  });

  it("rejects reports for a private message absent from the fake state", async () => {
    const fake = new FakePiefedInstance({
      host: "missing-message.piefed.test",
    });
    fake.seed.loggedInAs(fake.seed.person({ name: "voyager" }));
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    await expect(
      client.createPrivateMessageReport({
        private_message_id: 999,
        reason: "Spam or abuse",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects unauthenticated reports", async () => {
    const fake = new FakePiefedInstance({
      host: "anonymous-reports.piefed.test",
    });
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    await expect(
      client.createPrivateMessageReport({
        private_message_id: 42,
        reason: "Spam or abuse",
      }),
    ).rejects.toMatchObject({ code: "incorrect_login", status: 400 });
  });
});
