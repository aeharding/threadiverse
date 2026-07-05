// Instances behind bot protection (e.g. piefed.social's Cloudflare)
// challenge requests that don't carry the app's User-Agent — and Capacitor
// Android apps must send it as x-cap-user-agent to survive the webview
// (see USER_AGENT_HEADERS). These tests pin the two behaviors that keep
// that working: header forwarding on every piefed code path, and challenge
// responses surfacing as BotChallengeError instead of raw JSON parse errors.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { BaseClientOptions } from "../src/BaseClient";
import { UnexpectedResponseError } from "../src/errors";
import ThreadiverseClient, { clearCache } from "../src/ThreadiverseClient";

const BASE_URL = "https://piefed.example.com";
const NODEINFO_HREF = `${BASE_URL}/nodeinfo/2.1`;

const CLIENT_HEADERS = {
  Authorization: "Bearer abc",
  ["Cache-Control"]: "no-cache",
  ["User-Agent"]: "VoyagerApp/1.0",
  ["x-cap-user-agent"]: "VoyagerApp/1.0",
};

const CLOUDFLARE_CHALLENGE = new Response(
  "<!DOCTYPE html><title>Just a moment...</title>",
  {
    headers: { "cf-mitigated": "challenge", "Content-Type": "text/html" },
    status: 403,
  },
);

const ANUBIS_CHALLENGE = new Response(
  '<!DOCTYPE html><script src="/.within.website/x/cmd/anubis/static/js/main.mjs"></script>',
  { headers: { "Content-Type": "text/html" }, status: 200 },
);

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

const NODEINFO_LINKS = {
  links: [
    {
      href: NODEINFO_HREF,
      rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
    },
  ],
};

const NODEINFO = { software: { name: "piefed", version: "1.6.27" } };

const SITE = {
  admins: [],
  site: {
    actor_id: `${BASE_URL}/`,
    name: "Test",
    registration_mode: "Open",
    user_count: 100,
  },
  version: "1.6.27",
};

/**
 * Client against a piefed instance where every route can be overridden.
 * Records the headers of each request by pathname.
 */
function setup(overrides: Record<string, () => Response> = {}) {
  const requestHeaders: Record<string, Headers> = {};

  const fetchFunction = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const { pathname } = new URL(request.url);

      requestHeaders[pathname] = request.headers;

      const override = overrides[pathname];
      if (override) return override();

      switch (pathname) {
        case "/.well-known/nodeinfo":
          return json(NODEINFO_LINKS);
        case "/api/alpha/site":
          return json(SITE);
        case "/nodeinfo/2.1":
          return json(NODEINFO);
        default:
          throw new Error(`Unexpected fetch call: ${request.url}`);
      }
    },
  ) as BaseClientOptions["fetchFunction"];

  const client = new ThreadiverseClient(BASE_URL, {
    fetchFunction,
    headers: CLIENT_HEADERS,
  });

  return { client, requestHeaders };
}

beforeEach(() => {
  clearCache();
});

describe("piefed header forwarding", () => {
  it("forwards the user agent (but not credentials) to discovery", async () => {
    const { client, requestHeaders } = setup();

    await client.connect();

    for (const pathname of ["/.well-known/nodeinfo", "/nodeinfo/2.1"]) {
      const headers = requestHeaders[pathname]!;
      expect(headers.get("user-agent")).toBe("VoyagerApp/1.0");
      expect(headers.get("x-cap-user-agent")).toBe("VoyagerApp/1.0");
      expect(headers.get("authorization")).toBeNull();
      expect(headers.get("cache-control")).toBeNull();
    }
  });

  it("forwards user agent + Authorization (but nothing else) to API calls", async () => {
    const { client, requestHeaders } = setup();

    await client.getSite();

    const headers = requestHeaders["/api/alpha/site"]!;
    expect(headers.get("user-agent")).toBe("VoyagerApp/1.0");
    expect(headers.get("x-cap-user-agent")).toBe("VoyagerApp/1.0");
    expect(headers.get("authorization")).toBe("Bearer abc");
    // Not in piefed's Access-Control-Allow-Headers — would fail preflight
    expect(headers.get("cache-control")).toBeNull();
  });
});

describe("bot challenge detection", () => {
  it("Cloudflare challenge during discovery throws BotChallengeError", async () => {
    const { client } = setup({
      "/.well-known/nodeinfo": () => CLOUDFLARE_CHALLENGE.clone(),
    });

    await expect(client.connect()).rejects.toThrow(
      expect.objectContaining({
        name: "BotChallengeError",
        vendor: "cloudflare",
      }),
    );
  });

  it("Anubis challenge (2xx HTML) during discovery throws BotChallengeError", async () => {
    const { client } = setup({
      "/.well-known/nodeinfo": () => ANUBIS_CHALLENGE.clone(),
    });

    await expect(client.connect()).rejects.toThrow(
      expect.objectContaining({ name: "BotChallengeError", vendor: "anubis" }),
    );
  });

  it("Cloudflare challenge on a piefed API call throws BotChallengeError", async () => {
    const { client } = setup({
      "/api/alpha/site": () => CLOUDFLARE_CHALLENGE.clone(),
    });

    await expect(client.getSite()).rejects.toThrow(
      expect.objectContaining({
        name: "BotChallengeError",
        vendor: "cloudflare",
      }),
    );
  });

  it("Anubis challenge (2xx HTML) on a piefed API call throws BotChallengeError", async () => {
    const { client } = setup({
      "/api/alpha/site": () => ANUBIS_CHALLENGE.clone(),
    });

    await expect(client.getSite()).rejects.toThrow(
      expect.objectContaining({ name: "BotChallengeError", vendor: "anubis" }),
    );
  });

  it("other non-JSON discovery responses throw UnexpectedResponseError", async () => {
    const { client } = setup({
      "/.well-known/nodeinfo": () =>
        new Response("<!DOCTYPE html>not a fediverse instance", {
          headers: { "Content-Type": "text/html" },
          status: 200,
        }),
    });

    await expect(client.connect()).rejects.toBeInstanceOf(
      UnexpectedResponseError,
    );
  });
});
