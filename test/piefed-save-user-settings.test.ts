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

describe("piefed saveUserSettings wire contract", () => {
  it.each([true, false])(
    "sends show_nsfw=%s to PieFed's exact settings route",
    async (showNsfw) => {
      const { client, requests } = setup();
      const controller = new AbortController();

      await expect(
        client.saveUserSettings(
          { show_nsfw: showNsfw },
          { signal: controller.signal },
        ),
      ).resolves.toBeUndefined();

      const request = requests[0]!;
      expect(request.method).toBe("PUT");
      expect(request.url).toBe(`${BASE_URL}/api/alpha/user/save_user_settings`);
      expect(request.headers.get("authorization")).toBe("Bearer test-token");
      expect(request.headers.get("x-not-allowed")).toBeNull();
      await expect(request.clone().json()).resolves.toEqual({
        show_nsfw: showNsfw,
      });

      expect(request.signal.aborted).toBe(false);
      controller.abort();
      expect(request.signal.aborted).toBe(true);
    },
  );

  it("surfaces authentication failures from the settings endpoint", async () => {
    const { client } = setup(
      Response.json(
        { message: "incorrect_login" },
        { status: 400, statusText: "Bad Request" },
      ),
    );

    const error = await client
      .saveUserSettings({ show_nsfw: true })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ResponseError);
    expect(error).toMatchObject({
      code: "incorrect_login",
      software: "piefed",
      status: 400,
    });
  });
});

describe("FakePiefedInstance saveUserSettings", () => {
  it("records the canonical payload and updates Voyager's next getSite read", async () => {
    const fake = new FakePiefedInstance({ host: "settings.piefed.test" });
    const me = fake.seed.person({ id: 7, name: "voyager" });
    fake.seed.loggedInAs(me);
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    expect(
      (await client.getSite()).my_user?.local_user_view.local_user,
    ).toEqual(expect.objectContaining({ show_nsfw: false }));
    expect(client.capabilities.saveUserSettings).toBe(true);

    await client.saveUserSettings({ show_nsfw: true });

    expect(fake.callsTo("saveUserSettings")).toEqual([{ show_nsfw: true }]);
    expect(
      (await client.getSite()).my_user?.local_user_view.local_user,
    ).toEqual(expect.objectContaining({ show_nsfw: true }));
  });

  it("rejects unauthenticated writes like a real PieFed instance", async () => {
    const fake = new FakePiefedInstance({
      host: "anonymous-settings.piefed.test",
    });
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());

    await expect(
      client.saveUserSettings({ show_nsfw: true }),
    ).rejects.toMatchObject({ code: "incorrect_login", status: 400 });
    expect(fake.callsTo("saveUserSettings")).toEqual([{ show_nsfw: true }]);
  });
});
