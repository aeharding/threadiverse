import { describe, expect, it, vi } from "vitest";

import { BaseClientOptions } from "../src/BaseClient";
import { ResponseError } from "../src/errors";
import { UnsafePiefedClient } from "../src/providers/piefed";

const BASE_URL = "https://piefed.example.com";

function setup(response: Response = Response.json({ success: true })) {
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

  return { client, fetchFunction, requests };
}

describe("piefed logout wire contract", () => {
  it("revokes the bearer token without sending a request body", async () => {
    const { client, fetchFunction, requests } = setup();

    await expect(client.logout()).resolves.toBeUndefined();

    expect(fetchFunction).toHaveBeenCalledOnce();
    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${BASE_URL}/api/alpha/user/logout`);
    expect(request.headers.get("authorization")).toBe("Bearer test-token");
    expect(request.headers.get("x-not-allowed")).toBeNull();
    expect(request.headers.get("content-type")).toBeNull();
    await expect(request.clone().text()).resolves.toBe("");
  });

  it("preserves PieFed's deployed error envelope", async () => {
    const response = {
      code: 400,
      message: "incorrect_login",
      status: "Bad Request",
    };
    const { client } = setup(Response.json(response, { status: 400 }));

    const error = await client.logout().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ResponseError);
    expect(error).toMatchObject({
      code: "incorrect_login",
      message: "incorrect_login",
      response,
      software: "piefed",
      status: 400,
    });
  });

  it("also surfaces the generated message-only DefaultError shape", async () => {
    const { client } = setup(
      Response.json(
        { message: "JWT token could not be revoked" },
        { status: 400, statusText: "Bad Request" },
      ),
    );

    const error = await client.logout().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ResponseError);
    expect(error).toMatchObject({
      code: "JWT token could not be revoked",
      message: "JWT token could not be revoked",
      software: "piefed",
      status: 400,
    });
  });

  it("forwards the request signal", async () => {
    const { client, requests } = setup();
    const abortController = new AbortController();

    await client.logout({ signal: abortController.signal });

    const request = requests[0]!;
    expect(request.signal.aborted).toBe(false);

    abortController.abort();
    expect(request.signal.aborted).toBe(true);
  });
});
