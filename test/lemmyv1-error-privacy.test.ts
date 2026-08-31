import { afterEach, describe, expect, it, vi } from "vitest";

import { IncorrectLoginError, ResponseError } from "../src/errors";
import { FakeLemmyV1Instance } from "../src/testing";
import ThreadiverseClient from "../src/ThreadiverseClient";

describe("Lemmy v1 error privacy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not log credentials when login fails", async () => {
    const fake = new FakeLemmyV1Instance();
    fake.on.login({
      json: {
        error: "incorrect_login",
        message: "The supplied credentials were rejected",
      },
      status: 401,
    });
    const client = new ThreadiverseClient(fake.origin, fake.clientOptions());
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const credentials = {
      password: "password-private-sentinel",
      totp_2fa_token: "totp-private-sentinel",
      username_or_email: "username-private-sentinel",
    };

    let thrown: unknown;
    try {
      await client.login(credentials);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(IncorrectLoginError);
    expect(thrown).toMatchObject({
      cause: {
        message: "The supplied credentials were rejected",
        name: "incorrect_login",
        status: 401,
      },
      code: "incorrect_login",
      software: "lemmy",
      status: 401,
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does not log a private message when a non-JSON failure is returned", async () => {
    const fake = new FakeLemmyV1Instance();
    const options = fake.clientOptions();
    const instanceFetch = options.fetchFunction!;
    const fetchFunction: typeof fetch = async (input, init) => {
      const request = new Request(input, init);

      if (request.url.endsWith("/api/v4/private_message")) {
        return new Response("Bad gateway", {
          headers: { "Content-Type": "text/plain" },
          status: 502,
          statusText: "Bad Gateway",
        });
      }

      return instanceFetch(input, init);
    };
    const client = new ThreadiverseClient(fake.origin, {
      ...options,
      fetchFunction,
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    let thrown: unknown;
    try {
      await client.createPrivateMessage({
        content: "private-message-content-sentinel",
        recipient_id: 42,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ResponseError);
    expect(thrown).toMatchObject({
      cause: { message: "", name: "Bad Gateway", status: 502 },
      code: "Bad Gateway",
      software: "lemmy",
      status: 502,
    });
    expect(consoleError).not.toHaveBeenCalled();
  });
});
