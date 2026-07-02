// Read-only drift detection against live instances: if upstream software
// changes its wire format, this fails in the scheduled live-smoke workflow
// before consumers hit it in production. Gated so normal test runs stay
// offline — run manually with:
//
//   LIVE_SMOKE=1 pnpm vitest run test/live-smoke.test.ts

import { describe, expect, it } from "vitest";

import ThreadiverseClient from "../src/ThreadiverseClient";

const INSTANCES = [
  { software: "lemmy", url: "https://lemmy.world" },
  { software: "piefed", url: "https://piefed.social" },
  // TODO: add a Lemmy v1 instance once a stable public one exists
] as const;

const OPTIONS = { timeout: 30_000 };

describe.runIf(process.env.LIVE_SMOKE)("live smoke", () => {
  describe.each(INSTANCES)("$url", ({ software, url }) => {
    const client = new ThreadiverseClient(url, {
      discoveryCache: new Map(),
    });

    it("discovers software", OPTIONS, async () => {
      expect((await client.getSoftware()).name).toBe(software);
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

      expect(Array.isArray(data)).toBe(true);
    });
  });
});
