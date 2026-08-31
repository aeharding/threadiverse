// Read-only drift detection against live instances: if upstream software
// changes its wire format, this fails in the scheduled live-smoke workflow
// before consumers hit it in production. Gated so normal test runs stay
// offline — run manually with:
//
//   LIVE_SMOKE=1 pnpm vitest run test/live-smoke.test.ts

import { describe, expect, it } from "vitest";

import { detectBotChallenge } from "../src/errors";
import ThreadiverseClient from "../src/ThreadiverseClient";

const INSTANCES = [
  { software: "lemmy", url: "https://lemmy.world" },
  { software: "piefed", url: "https://piefed.social" },
  // TODO: add a Lemmy v1 instance once a stable public one exists
] as const;

const OPTIONS = { retry: 2, timeout: 30_000 };

// If the workflow and this gate ever drift apart (e.g. the env var is
// renamed in one place), the scheduled run would stay green forever while
// testing nothing. Fail loudly instead.
it.runIf(
  process.env.GITHUB_WORKFLOW === "live-smoke" && !process.env.LIVE_SMOKE,
)("live-smoke workflow must set LIVE_SMOKE", () => {
  expect.unreachable("live-smoke gate misconfigured");
});

describe.runIf(process.env.LIVE_SMOKE)("live smoke", () => {
  describe.each(INSTANCES)("$url", ({ software, url }) => {
    const client = new ThreadiverseClient(url, {
      discoveryCache: new Map(),
    });

    it("discovers software", OPTIONS, async () => {
      expect((await client.connect()).software.name).toBe(software);
    });

    it("getSite passes canonical validation", OPTIONS, async () => {
      const site = await client.getSite();

      expect(site.site_view.site.name).toBeTruthy();
    });

    it("getPosts passes canonical validation", OPTIONS, async () => {
      const { data } = await client.getPosts({ limit: 3, type_: "local" });

      expect(data.length).toBeGreaterThan(0);
    });

    it("getComments passes canonical validation", OPTIONS, async () => {
      const { data } = await client.getComments({
        limit: 3,
        type_: "local",
      });

      expect(data.length).toBeGreaterThan(0);
    });

    it(
      "max_depth means the same depth on every provider",
      OPTIONS,
      async () => {
        // The adapters absorb each server's own base (PieFed counts from
        // below top-level, Lemmy from the post). If a server changes that,
        // this catches it before consumers do.
        const { data: posts } = await client.getPosts({
          limit: 20,
          type_: "local",
        });
        const post = posts.find((view) => view.post.comments > 0);
        expect(post, "no post with comments to probe").toBeDefined();

        const { data } = await client.getComments({
          limit: 50,
          max_depth: 1,
          post_id: post!.post.id,
        });

        // Depth 1 is top-level only: paths look like `0.<id>`
        for (const view of data)
          expect(view.comment.path.split(".")).toHaveLength(2);
      },
    );

    it("all-type search passes canonical validation", OPTIONS, async () => {
      // PieFed has no all-type search endpoint — the adapter fans out and
      // merges, so an unspecified type_ must work everywhere
      const { data } = await client.search({ limit: 3, search_term: "news" });

      expect(data.length).toBeGreaterThan(0);
    });

    it("search passes canonical validation", OPTIONS, async () => {
      const { data } = await client.search({
        limit: 3,
        search_term: "news",
        type_: "communities",
      });

      expect(data.length).toBeGreaterThan(0);
    });
  });
});

// PieFed publishes post/comment report moderation as four separate routes.
// Probe them without credentials: a real route must reject the request, while
// 404/405 means the deployed API has drifted from the generated contract.
describe.runIf(process.env.LIVE_SMOKE)("live PieFed report routes", () => {
  const reportRoutes = [
    { method: "GET", path: "/api/alpha/comment/report/list" },
    { method: "GET", path: "/api/alpha/post/report/list" },
    { method: "PUT", path: "/api/alpha/comment/report/resolve" },
    { method: "PUT", path: "/api/alpha/post/report/resolve" },
  ] as const;

  it.each(reportRoutes)(
    "$method $path is deployed",
    OPTIONS,
    async ({ method, path }) => {
      const resolving = method === "PUT";
      const response = await fetch(`https://piefed.social${path}`, {
        body: resolving
          ? JSON.stringify({ report_id: 0, resolved: true })
          : undefined,
        headers: resolving ? { "Content-Type": "application/json" } : undefined,
        method,
      });

      expect(response.ok).toBe(false);
      expect(response.status).not.toBe(404);
      expect(response.status).not.toBe(405);
    },
  );
});

describe.runIf(process.env.LIVE_SMOKE)("live PieFed modlog", () => {
  it(
    "maps the public grouped response into canonical actions",
    OPTIONS,
    async () => {
      const client = new ThreadiverseClient("https://piefed.social", {
        discoveryCache: new Map(),
      });

      const response = await client.getModlog({ limit: 2 });

      expect(response.data).toHaveLength(2);
      expect(response.next_page).toEqual(expect.any(String));
      if (typeof response.next_page !== "string")
        throw new Error("live PieFed modlog did not return a composite cursor");
      for (const item of response.data) {
        expect(item.modlog.id).toBeGreaterThan(0);
        expect(Date.parse(item.modlog.published_at)).not.toBeNaN();
      }

      const second = await client.getModlog({
        limit: 2,
        page_cursor: response.next_page,
      });
      expect(second.data).toHaveLength(2);
      expect(
        Date.parse(response.data.at(-1)!.modlog.published_at),
      ).toBeGreaterThanOrEqual(Date.parse(second.data[0]!.modlog.published_at));
      const identities = [...response.data, ...second.data].map(
        (item) => `${item.modlog.kind}:${item.modlog.id}`,
      );
      expect(new Set(identities).size).toBe(identities.length);

      // Voyager exposes community-specific modlogs. Derive a real id from
      // the response so the probe stays independent of seeded instance data.
      const community = [...response.data, ...second.data].find(
        (item) => item.target_community,
      )?.target_community;
      expect(community, "no community action available to probe").toBeDefined();

      const filtered = await client.getModlog({
        community_id: community!.id,
        limit: 2,
      });
      expect(filtered.data.length).toBeGreaterThan(0);
      expect(
        filtered.data.some(
          (item) => item.target_community?.id === community!.id,
        ),
      ).toBe(true);

      const exhausted = await client.getModlog({
        limit: 2,
        page_cursor: 1_000_000,
      });
      expect(exhausted.data).toEqual([]);
      expect(exhausted.next_page).toBeUndefined();
    },
  );
});

describe.runIf(process.env.LIVE_SMOKE)(
  "live PieFed Voyager parity routes",
  () => {
    const origin = "https://piefed.social";
    const client = new ThreadiverseClient(origin, {
      discoveryCache: new Map(),
    });

    it("fetches and validates public site metadata", OPTIONS, async () => {
      const { metadata } = await client.getSiteMetadata({
        url: "https://example.com/",
      });

      expect(metadata).toBeTypeOf("object");
    });

    it("maps the live site's downvote policy", OPTIONS, async () => {
      const [wireResponse, canonical] = await Promise.all([
        fetch(`${origin}/api/alpha/site`),
        client.getSite(),
      ]);
      expect(wireResponse.ok).toBe(true);
      const wire = (await wireResponse.json()) as {
        site: { enable_downvotes?: boolean };
      };
      const expected = wire.site.enable_downvotes === false ? "disable" : "all";

      expect(canonical.site_view.local_site.comment_downvotes).toBe(expected);
      expect(canonical.site_view.local_site.post_downvotes).toBe(expected);
    });

    it("deploys the authenticated mutation routes", OPTIONS, async () => {
      // Resolve real public ids, then omit auth. Each route must reject
      // before changing state; 404/405 would instead indicate API drift.
      const { data: posts } = await client.getPosts({
        limit: 20,
        type_: "local",
      });
      const post = posts.find((view) => view.post.comments > 0);
      expect(post, "no post with comments to probe").toBeDefined();

      const { data: comments } = await client.getComments({
        limit: 1,
        post_id: post!.post.id,
      });
      expect(comments[0], "no comment to probe").toBeDefined();

      const routes = [
        {
          body: {
            comment_reply_id: comments[0]!.comment.id,
            distinguished: true,
          },
          method: "POST",
          path: "/api/alpha/comment/distinguish",
        },
        {
          body: { community_id: post!.community.id, subscribe: true },
          method: "PUT",
          path: "/api/alpha/community/subscribe",
        },
        {
          body: { post_id: post!.post.id, subscribe: true },
          method: "PUT",
          path: "/api/alpha/post/subscribe",
        },
        {
          body: { file: `${origin}/media/nonexistent-threadiverse-probe` },
          method: "POST",
          path: "/api/alpha/image/delete",
        },
      ] as const;

      for (const { body, method, path } of routes) {
        const response = await fetch(`${origin}${path}`, {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
          method,
        });

        expect(response.ok, `${method} ${path} unexpectedly succeeded`).toBe(
          false,
        );
        expect(
          response.status,
          `${method} ${path} did not reject`,
        ).toBeGreaterThanOrEqual(400);
        expect(
          response.status,
          `${method} ${path} returned a server error`,
        ).toBeLessThan(500);
        expect(response.status, `${method} ${path} is missing`).not.toBe(404);
        expect(
          response.status,
          `${method} ${path} has the wrong method`,
        ).not.toBe(405);
      }
    });
  },
);

// Bot-challenge detection markers are empirical (Anubis documents no
// contract and has renamed its cookies before) — verify they still match a
// real deployment. Requests a page with a browser-ish User-Agent, which
// Anubis challenges by default.
describe.runIf(process.env.LIVE_SMOKE)("anubis challenge detection", () => {
  it("recognizes a live anubis challenge", OPTIONS, async () => {
    const response = await fetch("https://xeiaso.net/", {
      headers: {
        // Node lets fetch override User-Agent (unlike browsers)
        ["User-Agent"]: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      },
    });

    expect(detectBotChallenge(response, await response.text())).toBe("anubis");
  });
});
