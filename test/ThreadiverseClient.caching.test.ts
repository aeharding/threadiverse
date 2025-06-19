import { describe, it, expect, beforeEach, vi } from "vitest";
import { clearCache } from "../src/ThreadiverseClient";
import { BaseClientOptions } from "../src/BaseClient";
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
                rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
                href: "https://lemmy-cache-test.example.com/nodeinfo/2.1",
              },
            ],
          }),
          {
            status: 200,
            statusText: "OK",
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      // Nodeinfo
      if (urlStr === "https://lemmy-cache-test.example.com/nodeinfo/2.1") {
        return new Response(
          JSON.stringify({ software: { name: "lemmy", version: "0.19.0" } }),
          {
            status: 200,
            statusText: "OK",
            headers: { "Content-Type": "application/json" },
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
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json" },
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
});
