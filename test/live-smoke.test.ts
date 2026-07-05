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
