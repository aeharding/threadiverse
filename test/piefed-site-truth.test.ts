import { describe, expect, it, vi } from "vitest";

import type { BaseClientOptions } from "../src/BaseClient";
import type { components } from "../src/providers/piefed/schema";
import type { Wire } from "../src/testing/wire";

import PiefedClient from "../src/providers/piefed";
import { FakePiefedInstance } from "../src/testing";
import { createPiefedBuilders } from "../src/testing/piefed/builders";
import ThreadiverseClient from "../src/ThreadiverseClient";

const BASE_URL = "https://piefed.example.com";
const build = createPiefedBuilders({ host: "piefed.example.com" });

type Schemas = components["schemas"];
type SiteResponse = Wire<Schemas["GetSiteResponse"]>;

const me = build.person({ id: 41, user_name: "voyager" });

function setup(response: unknown) {
  const requests: Request[] = [];
  const fetchFunction = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return Response.json(response);
    },
  ) as BaseClientOptions["fetchFunction"];
  const client = new PiefedClient(BASE_URL, { fetchFunction, headers: {} });

  return { client, requests };
}

describe("PieFed getSite truth", () => {
  it("derives the current admin from a stable person-id match", async () => {
    const renamedAdmin = build.person({
      id: me.id,
      title: "A renamed display",
      user_name: "renamed-admin",
    });
    const response = build.getSiteResponse({
      admins: [build.personView(renamedAdmin, { isAdmin: true })],
      myUser: me,
    });

    const site = await setup(response).client.getSite();

    expect(site.my_user?.local_user_view.local_user.admin).toBe(true);
    expect(site.admins.map((admin) => admin.person.id)).toEqual([me.id]);
  });

  it("does not grant admin for a matching name with a different id", async () => {
    const sameName = build.person({ id: 42, user_name: me.user_name });
    const response = build.getSiteResponse({
      admins: [build.personView(sameName, { isAdmin: true })],
      myUser: me,
    });

    const site = await setup(response).client.getSite();

    expect(site.my_user?.local_user_view.local_user.admin).toBe(false);
  });

  it("does not grant admin from an inconsistent false admin row", async () => {
    const response = build.getSiteResponse({
      admins: [build.personView(me, { isAdmin: false })],
      myUser: me,
    });

    const site = await setup(response).client.getSite();

    expect(site.my_user?.local_user_view.local_user.admin).toBe(false);
  });

  it.each([
    {
      label: "missing",
      response: (({ admins: _admins, ...response }) => response)(
        build.getSiteResponse({ myUser: me }),
      ),
    },
    {
      label: "null",
      response: {
        ...build.getSiteResponse({ myUser: me }),
        admins: null,
      },
    },
    {
      label: "a null row",
      response: {
        ...build.getSiteResponse({ myUser: me }),
        admins: [null],
      },
    },
  ])(
    "treats $label deployed admin data as no evidence",
    async ({ response }) => {
      const site = await setup(response).client.getSite();

      expect(site.admins).toEqual([]);
      expect(site.my_user?.local_user_view.local_user.admin).toBe(false);
    },
  );

  it.each([
    [true, "all"],
    [false, "disable"],
  ] as const)(
    "maps enable_downvotes=%s to both canonical vote modes",
    async (enableDownvotes, expected) => {
      const response = build.getSiteResponse({ enableDownvotes });

      const site = await setup(response).client.getSite();

      expect(site.site_view.local_site.comment_downvotes).toBe(expected);
      expect(site.site_view.local_site.post_downvotes).toBe(expected);
    },
  );

  it("preserves the enabled fallback for older responses without the field", async () => {
    const response = build.getSiteResponse();
    const olderSite = { ...response.site };
    delete olderSite.enable_downvotes;
    const olderResponse = {
      ...response,
      site: olderSite,
    } satisfies SiteResponse;

    const site = await setup(olderResponse).client.getSite();

    expect(site.site_view.local_site.comment_downvotes).toBe("all");
    expect(site.site_view.local_site.post_downvotes).toBe("all");
  });
});

describe("FakePiefedInstance getSite truth", () => {
  it("models admin identity and disabled downvotes for consumer tests", async () => {
    const fake = new FakePiefedInstance({ enableDownvotes: false });
    const admin = fake.seed.person({ admin: true, id: 7, name: "same-name" });
    const nonAdmin = fake.seed.person({ id: 8, name: "same-name" });
    fake.seed.loggedInAs(admin);
    const client = new ThreadiverseClient(fake.origin, {
      ...fake.clientOptions(),
      headers: { Authorization: "Bearer test" },
    });

    const adminSite = await client.getSite();
    expect(adminSite.my_user?.local_user_view.local_user.admin).toBe(true);
    expect(adminSite.admins.map((view) => view.person.id)).toEqual([admin.id]);
    expect(adminSite.site_view.local_site.comment_downvotes).toBe("disable");
    expect(adminSite.site_view.local_site.post_downvotes).toBe("disable");

    fake.seed.loggedInAs(nonAdmin);
    const nonAdminSite = await client.getSite();
    expect(nonAdminSite.my_user?.local_user_view.local_user.admin).toBe(false);
  });
});
