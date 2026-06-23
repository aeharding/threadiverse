import { beforeEach, describe, expect, it, vi } from "vitest";

import { BaseClientOptions } from "../src/BaseClient";
import ThreadiverseClient, { clearCache } from "../src/ThreadiverseClient";

const BASE_URL = "https://piefed.example.com";
const NODEINFO_HREF = "https://piefed.example.com/nodeinfo/2.1";

// Mirrors the shape PieFed's GET /api/alpha/site returns for an authenticated
// request: the logged-in user's post/comment totals live on
// `my_user.local_user_view.counts`, NOT on the nested `person` object.
const SITE_RESPONSE = {
  admins: [],
  my_user: {
    community_blocks: [],
    discussion_languages: [],
    follows: [],
    instance_blocks: [],
    local_user_view: {
      counts: {
        comment_count: 42,
        person_id: 99,
        post_count: 7,
      },
      local_user: {
        show_nsfw: true,
      },
      person: {
        actor_id: "https://piefed.example.com/u/me",
        banned: false,
        bot: false,
        deleted: false,
        id: 99,
        instance_id: 1,
        local: true,
        published: "2024-01-01T00:00:00.000000Z",
        title: "Me",
        user_name: "me",
      },
    },
    moderates: [],
    person_blocks: [],
  },
  site: {
    actor_id: "https://piefed.example.com",
    description: "An example PieFed instance",
    icon: "https://piefed.example.com/icon.png",
    name: "Piefed Example",
    registration_mode: "Open",
    sidebar: "Sidebar markdown",
    user_count: 100,
  },
  version: "1.6.27",
};

function setupSiteTest() {
  const mockFetch = vi.fn(async (url: unknown) => {
    const urlStr =
      typeof url === "string"
        ? url
        : url instanceof URL
          ? url.toString()
          : url && typeof url === "object" && "url" in url
            ? (url as Request).url
            : (() => {
                throw new Error("Unsupported url type in fetch mock");
              })();

    if (urlStr === `${BASE_URL}/.well-known/nodeinfo`) {
      return new Response(
        JSON.stringify({
          links: [
            {
              href: NODEINFO_HREF,
              rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (urlStr === NODEINFO_HREF) {
      return new Response(
        JSON.stringify({
          software: { name: "piefed", version: "1.6.27" },
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (urlStr.startsWith(`${BASE_URL}/api/alpha/site`)) {
      return new Response(JSON.stringify(SITE_RESPONSE), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error(`Unexpected fetch call: ${urlStr}`);
  });

  const options: BaseClientOptions = { fetchFunction: mockFetch, headers: {} };
  return new ThreadiverseClient(BASE_URL, options);
}

describe("piefed getSite my_user counts", () => {
  beforeEach(() => {
    clearCache();
  });

  it("surfaces local_user_view counts on the person (own profile)", async () => {
    const client = setupSiteTest();

    const response = await client.getSite();

    const person = response.my_user!.local_user_view.person;
    expect(person.comment_count).toBe(42);
    expect(person.post_count).toBe(7);
  });
});
