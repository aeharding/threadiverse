import { vi } from "vitest";
import ThreadiverseClient from "../src/ThreadiverseClient";
import { BaseClientOptions } from "../src/BaseClient";

export type ProviderTestConfig = {
  baseUrl: string;
  nodeinfoHref: string;
  nodeinfoSoftware: { name: string; version: string };
};

export function setupProviderTest({
  baseUrl,
  nodeinfoHref,
  nodeinfoSoftware,
}: ProviderTestConfig) {
  // Use a custom fetch mock that can handle both wellknown and openapi-fetch requests
  const mockFetch = vi.fn(async (url: unknown) => {
    let urlStr: string;
    if (typeof url === "string") {
      urlStr = url;
    } else if (url instanceof URL) {
      urlStr = url.toString();
    } else if (url && typeof url === "object" && "url" in url) {
      // Handle Request object
      urlStr = (url as Request).url;
    } else {
      throw new Error("Unsupported url type in fetch mock");
    }
    // Well-known nodeinfo
    if (urlStr === `${baseUrl}/.well-known/nodeinfo`) {
      return new Response(
        JSON.stringify({
          links: [
            {
              rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
              href: nodeinfoHref,
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
    if (urlStr === nodeinfoHref) {
      return new Response(JSON.stringify({ software: nodeinfoSoftware }), {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/json" },
      });
    }
    // Lemmy getPosts
    if (urlStr.startsWith("https://lemmy.example.com/api/v3/post/list")) {
      return new Response(JSON.stringify({ posts: [] }), {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "application/json" },
      });
    }
    // Piefed openapi-fetch getPosts
    if (urlStr.startsWith("https://piefed.example.com/api/alpha/post/list")) {
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

  const client = new ThreadiverseClient(baseUrl, options);
  return { client, mockFetch };
}

export const mockOptions: BaseClientOptions = {
  fetchFunction: vi.fn(),
  headers: {},
};
