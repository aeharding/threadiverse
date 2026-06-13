import { beforeEach, describe, expect, it, vi } from "vitest";

import { BaseClientOptions } from "../src/BaseClient";
import { clearCache } from "../src/ThreadiverseClient";
import ThreadiverseClient from "../src/ThreadiverseClient";

describe("ThreadiverseClient - Caching", () => {
  beforeEach(() => {
    clearCache();
  });

  it("should cache wellknown discovery for the same hostname", async () => {
    const mockFetch = vi.fn(async (url: unknown) => {
      let urlStr: string;
      if (typeof url === "string") {
        urlStr = url;
      } else if (url instanceof URL) {
        urlStr = url.toString();
      } else if (url && typeof url === "object" && "url" in url) {
        urlStr = (url as Request).url;
      } else {
        throw new Error("Unsupported url type in fetch mock");
      }

      // Well-known nodeinfo
      if (
        urlStr === "https://lemmy-cache-test.example.com/.well-known/nodeinfo"
      ) {
        return new Response(
          JSON.stringify({
            links: [
              {
                href: "https://lemmy-cache-test.example.com/nodeinfo/2.1",
                rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
              },
            ],
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
            statusText: "OK",
          },
        );
      }
      // Nodeinfo
      if (urlStr === "https://lemmy-cache-test.example.com/nodeinfo/2.1") {
        return new Response(
          JSON.stringify({ software: { name: "lemmy", version: "0.19.6" } }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
            statusText: "OK",
          },
        );
      }
      // Lemmy getPosts
      if (
        urlStr.startsWith(
          "https://lemmy-cache-test.example.com/api/v3/post/list",
        )
      ) {
        return new Response(JSON.stringify({ posts: [] }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
          statusText: "OK",
        });
      }
      throw new Error(`Unexpected fetch call: ${urlStr}`);
    });

    const options: BaseClientOptions = {
      fetchFunction: mockFetch,
      headers: {},
    };

    // Create first client and call getPosts
    const client1 = new ThreadiverseClient(
      "https://lemmy-cache-test.example.com",
      options,
    );
    await client1.getPosts({ community_name: "test" });

    // Create second client with same hostname and call getPosts
    const client2 = new ThreadiverseClient(
      "https://lemmy-cache-test.example.com",
      options,
    );
    await client2.getPosts({ community_name: "test2" });

    // Create third client with same hostname and call getPosts
    const client3 = new ThreadiverseClient(
      "https://lemmy-cache-test.example.com",
      options,
    );
    await client3.getPosts({ community_name: "test3" });

    // Verify that well-known discovery was only called once
    expect(mockFetch).toHaveBeenCalledWith(
      "https://lemmy-cache-test.example.com/.well-known/nodeinfo",
      expect.objectContaining({
        headers: {
          Accept: "application/json",
        },
      }),
    );

    // Verify that nodeinfo was only called once
    expect(mockFetch).toHaveBeenCalledWith(
      "https://lemmy-cache-test.example.com/nodeinfo/2.1",
      expect.objectContaining({
        headers: {
          Accept: "application/json",
        },
      }),
    );

    // Verify that getPosts was called 3 times (once for each client)
    const getPostsCalls = mockFetch.mock.calls.filter((call) => {
      const url =
        typeof call[0] === "string" ? call[0] : (call[0] as Request).url;
      return url.startsWith(
        "https://lemmy-cache-test.example.com/api/v3/post/list",
      );
    });
    expect(getPostsCalls).toHaveLength(3);

    // Verify total number of calls (2 discovery calls + 3 getPosts calls = 5)
    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it("scopes discovery to a provided discoveryCache instead of the global one", async () => {
    const HOST = "https://lemmy-scoped-cache.example.com";

    const mockFetch = vi.fn(async (url: unknown) => {
      const urlStr = typeof url === "string" ? url : (url as Request).url;

      if (urlStr === `${HOST}/.well-known/nodeinfo`)
        return Response.json({
          links: [
            {
              href: `${HOST}/nodeinfo/2.1`,
              rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
            },
          ],
        });
      if (urlStr === `${HOST}/nodeinfo/2.1`)
        return Response.json({
          software: { name: "lemmy", version: "0.19.6" },
        });
      if (urlStr.startsWith(`${HOST}/api/v3/post/list`))
        return Response.json({ posts: [] });
      throw new Error(`Unexpected fetch call: ${urlStr}`);
    });

    const discoveryCache = new Map<
      string,
      Promise<{ name: string; version: string }>
    >();

    const client1 = new ThreadiverseClient(HOST, {
      discoveryCache,
      fetchFunction: mockFetch,
    });
    await client1.getPosts({});

    expect(discoveryCache.size).toBe(1);

    // A second client with its own fresh cache must re-discover (proving the
    // global cache was not consulted or populated)
    const client2 = new ThreadiverseClient(HOST, {
      discoveryCache: new Map(),
      fetchFunction: mockFetch,
    });
    await client2.getPosts({});

    const discoveryCalls = mockFetch.mock.calls.filter((call) =>
      String(
        typeof call[0] === "string" ? call[0] : (call[0] as Request).url,
      ).endsWith("/.well-known/nodeinfo"),
    );
    expect(discoveryCalls).toHaveLength(2);
  });
});
