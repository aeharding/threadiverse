import { describe, expect, it, vi } from "vitest";

import type { components } from "../src/providers/piefed/schema";
import type { Wire } from "../src/testing/wire";

import { BaseClientOptions } from "../src/BaseClient";
import { InvalidPayloadError, UnexpectedResponseError } from "../src/errors";
import { UnsafePiefedClient } from "../src/providers/piefed";
import * as schemas from "../src/schemas";
import { createPiefedBuilders } from "../src/testing/piefed/builders";

const BASE_URL = "https://modlog.piefed.test";
const NOW = "2026-08-30T12:00:00Z";

type ModlogFixture = Wire<PiefedSchemas["GetModLogResponse"]>;
type PiefedSchemas = components["schemas"];

function at(second: number) {
  return `2026-08-30T12:00:${String(second).padStart(2, "0")}Z`;
}

function chronologyFixture(
  removedPosts: readonly (readonly [id: number, second: number])[],
  lockedPosts: readonly (readonly [id: number, second: number])[],
): ModlogFixture {
  const prototypes = modlogFixture();
  const fixture = emptyModlogFixture();

  fixture.removed_posts = removedPosts.map(([id, second]) => {
    const view = structuredClone(prototypes.removed_posts[0]!);
    view.mod_remove_post.id = id;
    view.mod_remove_post.when_ = at(second);
    return view;
  });
  fixture.locked_posts = lockedPosts.map(([id, second]) => {
    const view = structuredClone(prototypes.locked_posts[0]!);
    view.mod_lock_post.id = id;
    view.mod_lock_post.when_ = at(second);
    return view;
  });

  return fixture;
}

function emptyModlogFixture(): ModlogFixture {
  return {
    added: [],
    added_to_community: [],
    admin_purged_comments: [],
    admin_purged_communities: [],
    admin_purged_persons: [],
    admin_purged_posts: [],
    banned: [],
    banned_from_community: [],
    featured_posts: [],
    hidden_communities: [],
    locked_posts: [],
    removed_comments: [],
    removed_communities: [],
    removed_posts: [],
    transferred_to_community: [],
  } satisfies Wire<PiefedSchemas["GetModLogResponse"]>;
}

function modlogFixture() {
  const build = createPiefedBuilders({ host: "modlog.piefed.test", now: NOW });
  const moderator = build.person({ id: 1, user_name: "moderator" });
  const target = build.person({ id: 2, user_name: "target" });
  const community = build.community({ id: 3, name: "moderated" });
  const postView = build.postView({
    community,
    creator: target,
    id: 4,
    title: "Moderated post",
  });
  const commentView = build.commentView({
    body: "Moderated comment",
    creator: target,
    id: 5,
    post: postView,
  });

  return {
    added: [
      {
        mod_add: {
          id: 11,
          mod_person_id: moderator.id,
          other_person_id: target.id,
          removed: false,
          when_: at(11),
        },
        modded_person: target,
        moderator,
      },
    ],
    added_to_community: [
      {
        community,
        mod_add_community: {
          community_id: community.id,
          id: 9,
          mod_person_id: moderator.id,
          other_person_id: target.id,
          removed: true,
          when_: at(9),
        },
        modded_person: target,
        moderator,
      },
    ],
    admin_purged_comments: [
      {
        admin: moderator,
        admin_purge_comment: {
          admin_person_id: moderator.id,
          id: 15,
          post_id: postView.post.id,
          reason: "Sensitive data",
          when_: at(15),
        },
        post: postView.post,
      },
    ],
    admin_purged_communities: [
      {
        admin: moderator,
        admin_purge_community: {
          admin_person_id: moderator.id,
          id: 13,
          reason: "Illegal community",
          when_: at(13),
        },
      },
    ],
    admin_purged_persons: [
      {
        admin: moderator,
        admin_purge_person: {
          admin_person_id: moderator.id,
          id: 12,
          reason: "Legal request",
          when_: at(12),
        },
      },
    ],
    admin_purged_posts: [
      {
        admin: moderator,
        admin_purge_post: {
          admin_person_id: moderator.id,
          community_id: community.id,
          id: 14,
          reason: "Sensitive data",
          when_: at(14),
        },
        community,
      },
    ],
    banned: [
      {
        banned_person: target,
        mod_ban: {
          banned: false,
          expires: null,
          id: 8,
          mod_person_id: moderator.id,
          other_person_id: target.id,
          reason: null,
          when_: at(8),
        },
        moderator,
      },
    ],
    banned_from_community: [
      {
        banned_person: target,
        community,
        mod_ban_from_community: {
          banned: true,
          community_id: community.id,
          expires: "2030-01-01T00:00:00Z",
          id: 7,
          mod_person_id: moderator.id,
          other_person_id: target.id,
          reason: "Repeated spam",
          when_: at(7),
        },
        moderator,
      },
    ],
    featured_posts: [
      {
        community,
        mod_feature_post: {
          featured: true,
          id: 3,
          is_featured_community: true,
          mod_person_id: moderator.id,
          post_id: postView.post.id,
          when_: at(3),
        },
        moderator,
        post: postView.post,
      },
      {
        community,
        mod_feature_post: {
          featured: false,
          id: 4,
          is_featured_community: false,
          mod_person_id: moderator.id,
          post_id: postView.post.id,
          when_: at(4),
        },
        moderator,
        post: postView.post,
      },
    ],
    hidden_communities: [
      {
        admin: moderator,
        community,
        mod_hide_community: {
          community_id: community.id,
          hidden: false,
          id: 16,
          mod_person_id: moderator.id,
          reason: "Visibility restored",
          when_: at(16),
        },
      },
    ],
    locked_posts: [
      {
        community,
        mod_lock_post: {
          id: 2,
          locked: false,
          mod_person_id: moderator.id,
          post_id: postView.post.id,
          when_: at(2),
        },
        moderator,
        post: postView.post,
      },
    ],
    removed_comments: [
      {
        comment: commentView.comment,
        commenter: target,
        community,
        mod_remove_comment: {
          comment_id: commentView.comment.id,
          id: 5,
          mod_person_id: moderator.id,
          reason: "Off topic",
          removed: false,
          when_: at(5),
        },
        moderator,
        post: postView.post,
      },
    ],
    removed_communities: [
      {
        // Deleted communities really are returned this way by piefed.social.
        community: null,
        mod_remove_community: {
          community_id: null,
          id: 6,
          mod_person_id: moderator.id,
          reason: "Community deleted",
          removed: true,
          when_: at(6),
        },
        moderator,
      },
    ],
    removed_posts: [
      {
        community,
        mod_remove_post: {
          id: 1,
          mod_person_id: moderator.id,
          post_id: postView.post.id,
          reason: "Rule 1",
          removed: true,
          when_: at(1),
        },
        moderator,
        post: postView.post,
      },
    ],
    transferred_to_community: [
      {
        community,
        mod_transfer_community: {
          community_id: community.id,
          id: 10,
          mod_person_id: moderator.id,
          other_person_id: target.id,
          when_: at(10),
        },
        modded_person: target,
        moderator,
      },
    ],
  } satisfies Wire<PiefedSchemas["GetModLogResponse"]>;
}

function setup(
  fixtureForPage:
    | ((page: number) => ModlogFixture)
    | ModlogFixture = modlogFixture(),
) {
  const requests: Request[] = [];
  const fetchFunction = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
      const fixture =
        typeof fixtureForPage === "function"
          ? fixtureForPage(page)
          : fixtureForPage;
      return Response.json(fixture);
    },
  ) as BaseClientOptions["fetchFunction"];
  const client = new UnsafePiefedClient(BASE_URL, {
    fetchFunction,
    headers: {},
  });

  return { client, requests };
}

describe("piefed getModlog", () => {
  it("forwards every canonical filter and maps all deployed action buckets", async () => {
    const { client, requests } = setup();
    const abortController = new AbortController();

    const response = await client.getModlog(
      {
        comment_id: 5,
        community_id: 3,
        limit: 100,
        mod_person_id: 1,
        other_person_id: 2,
        post_id: 4,
      },
      { signal: abortController.signal },
    );

    expect(response.data.map((item) => item.modlog.id)).toEqual([
      16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
    ]);
    expect(response.data).toHaveLength(16);
    expect(response.data.map((item) => item.modlog.kind)).toEqual([
      "mod_change_community_visibility",
      "admin_purge_comment",
      "admin_purge_post",
      "admin_purge_community",
      "admin_purge_person",
      "admin_add",
      "mod_transfer_community",
      "mod_add_to_community",
      "admin_ban",
      "mod_ban_from_community",
      "admin_remove_community",
      "mod_remove_comment",
      "admin_feature_post_site",
      "mod_feature_post_community",
      "mod_lock_post",
      "mod_remove_post",
    ]);
    expect(response.next_page).toBeUndefined();

    const byId = new Map(
      response.data.map((item) => [item.modlog.id, item] as const),
    );
    expect(byId.get(4)?.modlog.is_revert).toBe(true);
    expect(byId.get(7)?.modlog).toMatchObject({
      expires_at: "2030-01-01T00:00:00Z",
      is_revert: false,
      reason: "Repeated spam",
    });
    expect(byId.get(8)?.modlog.expires_at).toBeUndefined();
    expect(byId.get(8)?.modlog.reason).toBeUndefined();
    expect(byId.get(9)?.modlog.is_revert).toBe(true);
    expect(byId.get(6)?.target_community).toBeUndefined();
    expect(byId.get(5)?.target_comment).toMatchObject({
      content: "Moderated comment",
      score: 0,
    });
    expect(byId.get(1)?.target_post).toMatchObject({
      comments: 0,
      name: "Moderated post",
    });
    expect(schemas.ListModlogResponse.safeParse(response).success).toBe(true);

    const request = requests[0]!;
    expect(request.method).toBe("GET");
    expect(new URL(request.url).pathname).toBe("/api/alpha/modlog");
    expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual({
      comment_id: "5",
      community_id: "3",
      limit: "50",
      mod_person_id: "1",
      other_person_id: "2",
      page: "1",
      post_id: "4",
    });

    abortController.abort();
    expect(request.signal.aborted).toBe(true);
  });

  it("returns exact limits across a grouped wire response and limit changes", async () => {
    const { client, requests } = setup();

    const first = await client.getModlog({ limit: 3 });
    expect(first.data.map((item) => item.modlog.id)).toEqual([16, 15, 14]);
    expect(first.next_page).toEqual(expect.any(String));
    if (typeof first.next_page !== "string") throw new Error("missing cursor");

    const second = await client.getModlog({
      limit: 5,
      page_cursor: first.next_page,
    });
    expect(second.data.map((item) => item.modlog.id)).toEqual([
      13, 12, 11, 10, 9,
    ]);
    expect(second.next_page).toEqual(expect.any(String));
    if (typeof second.next_page !== "string") throw new Error("missing cursor");

    const final = await client.getModlog({
      limit: 100,
      page_cursor: second.next_page,
    });
    expect(final.data.map((item) => item.modlog.id)).toEqual([
      8, 7, 6, 5, 4, 3, 2, 1,
    ]);
    expect(final.next_page).toBeUndefined();

    const all = [...first.data, ...second.data, ...final.data];
    expect(
      new Set(all.map((item) => `${item.modlog.kind}:${item.modlog.id}`)),
    ).toHaveProperty("size", 16);
    expect(
      requests.map((request) => new URL(request.url).searchParams.get("limit")),
    ).toEqual(["3", "3", "3"]);
  });

  it("pins PieFed's default bucket limit so omitted limits exhaust exactly", async () => {
    const { client, requests } = setup();

    const first = await client.getModlog({});
    expect(first.data.map((item) => item.modlog.id)).toEqual([
      16, 15, 14, 13, 12, 11, 10, 9, 8, 7,
    ]);
    expect(first.next_page).toEqual(expect.any(String));
    if (typeof first.next_page !== "string") throw new Error("missing cursor");

    const final = await client.getModlog({ page_cursor: first.next_page });
    expect(final.data.map((item) => item.modlog.id)).toEqual([
      6, 5, 4, 3, 2, 1,
    ]);
    expect(final.next_page).toBeUndefined();
    expect(new URL(requests[0]!.url).searchParams.get("limit")).toBe("10");
    expect(new URL(requests[1]!.url).searchParams.get("limit")).toBe("10");
  });

  it("terminates an empty numeric page", async () => {
    const { client, requests } = setup(emptyModlogFixture());

    const response = await client.getModlog({
      limit: 2,
      page_cursor: 7,
    });

    expect(response).toEqual({ data: [], next_page: undefined });
    expect(new URL(requests[0]!.url).searchParams.get("page")).toBe("7");
  });

  it("does not prefetch past an exact-full bucket and terminates its empty page", async () => {
    const { client, requests } = setup((page) =>
      page === 1
        ? chronologyFixture(
            [
              [101, 59],
              [102, 58],
            ],
            [],
          )
        : emptyModlogFixture(),
    );

    const first = await client.getModlog({ limit: 2 });
    expect(first.data.map((item) => item.modlog.id)).toEqual([101, 102]);
    expect(first.next_page).toEqual(expect.any(String));
    expect(
      requests.map((request) => new URL(request.url).searchParams.get("page")),
    ).toEqual(["1"]);
    if (typeof first.next_page !== "string") throw new Error("missing cursor");

    const exhausted = await client.getModlog({ page_cursor: first.next_page });
    expect(exhausted).toEqual({ data: [], next_page: undefined });
    expect(
      requests.map((request) => new URL(request.url).searchParams.get("page")),
    ).toEqual(["1", "2"]);
  });

  it("rejects a native bucket that violates its requested limit", async () => {
    const { client } = setup(
      chronologyFixture(
        [
          [101, 59],
          [102, 58],
        ],
        [],
      ),
    );

    await expect(client.getModlog({ limit: 1 })).rejects.toBeInstanceOf(
      UnexpectedResponseError,
    );
  });

  it("rejects malformed action timestamps instead of corrupting ordering", async () => {
    const fixture = chronologyFixture([[101, 59]], []);
    fixture.removed_posts[0]!.mod_remove_post.when_ = "not-a-timestamp";
    const { client } = setup((page) =>
      page === 1 ? fixture : emptyModlogFixture(),
    );

    await expect(client.getModlog({ limit: 2 })).rejects.toBeInstanceOf(
      UnexpectedResponseError,
    );
  });

  it("retains actions whose deleted optional subjects are null", async () => {
    const fixture: Wire<PiefedSchemas["GetModLogResponse"]> =
      structuredClone(modlogFixture());
    fixture.removed_posts[0]!.community = null;
    fixture.removed_posts[0]!.moderator = null;
    fixture.removed_posts[0]!.post = null;
    const { client } = setup(fixture);

    const response = await client.getModlog({ limit: 100 });
    const removedPost = response.data.find((item) => item.modlog.id === 1);
    const removedCommunity = response.data.find((item) => item.modlog.id === 6);

    expect(removedPost).toMatchObject({
      moderator: undefined,
      target_community: undefined,
      target_post: undefined,
    });
    expect(removedCommunity?.target_community).toBeUndefined();
    expect(schemas.ListModlogResponse.safeParse(response).success).toBe(true);
  });

  it("uses bucket rank for cross-action ties and ids within one bucket", async () => {
    const fixture = chronologyFixture(
      [
        [20, 2],
        [10, 2],
      ],
      [[2, 2]],
    );
    const { client } = setup((page) =>
      page === 1 ? fixture : emptyModlogFixture(),
    );

    const first = await client.getModlog({ limit: 2 });
    expect(first.next_page).toEqual(expect.any(String));
    if (typeof first.next_page !== "string") throw new Error("missing cursor");
    const second = await client.getModlog({
      limit: 1,
      page_cursor: first.next_page,
    });

    // IDs belong to separate PieFed tables, so a fixed bucket rank wins
    // across action types and remains stable across a canonical boundary.
    // IDs are the deterministic secondary key within one action bucket.
    expect(
      [...first.data, ...second.data].map((item) => item.modlog.id),
    ).toEqual([2, 20, 10]);
    expect(second.next_page).toEqual(expect.any(String));
    if (typeof second.next_page !== "string") throw new Error("missing cursor");
    await expect(
      client.getModlog({ page_cursor: second.next_page }),
    ).resolves.toEqual({ data: [], next_page: undefined });
  });

  it("globally merges independently paginated buckets without skips", async () => {
    const pages = new Map<number, ModlogFixture>([
      [
        1,
        chronologyFixture(
          [
            [101, 59],
            [102, 58],
          ],
          [
            [201, 30],
            [202, 29],
          ],
        ),
      ],
      [
        2,
        chronologyFixture(
          [
            [103, 57],
            [104, 56],
          ],
          [[203, 28]],
        ),
      ],
    ]);
    const { client } = setup((page) => pages.get(page) ?? emptyModlogFixture());

    const canonicalPages = [];
    let pageCursor: number | string | undefined;
    do {
      const response = await client.getModlog({
        limit: pageCursor === undefined ? 2 : undefined,
        page_cursor: pageCursor,
      });
      canonicalPages.push(response.data);
      pageCursor = response.next_page;
    } while (pageCursor !== undefined);

    expect(canonicalPages.map((page) => page.length)).toEqual([2, 2, 2, 1]);
    const all = canonicalPages.flat();
    expect(all.map((item) => item.modlog.id)).toEqual([
      101, 102, 103, 104, 201, 202, 203,
    ]);
    expect(
      new Set(all.map((item) => `${item.modlog.kind}:${item.modlog.id}`)),
    ).toHaveProperty("size", all.length);
    for (let index = 1; index < all.length; index++) {
      expect(
        Date.parse(all[index - 1]!.modlog.published_at),
      ).toBeGreaterThanOrEqual(Date.parse(all[index]!.modlog.published_at));
    }
  });

  it("keeps native offsets stable while canonical limits change across pages", async () => {
    const pages = new Map<number, ModlogFixture>([
      [
        1,
        chronologyFixture(
          [
            [110, 59],
            [109, 58],
          ],
          [
            [104, 40],
            [103, 39],
          ],
        ),
      ],
      [
        2,
        chronologyFixture(
          [
            [108, 57],
            [107, 56],
          ],
          [[102, 38]],
        ),
      ],
      [
        3,
        chronologyFixture(
          [
            [106, 55],
            [105, 54],
          ],
          [],
        ),
      ],
      [4, chronologyFixture([[101, 53]], [])],
    ]);
    const { client, requests } = setup(
      (page) => pages.get(page) ?? emptyModlogFixture(),
    );

    const data = [];
    let pageCursor: number | string | undefined;
    for (const limit of [2, 5, 1, 7]) {
      const response = await client.getModlog({
        limit,
        page_cursor: pageCursor,
      });
      data.push(...response.data);
      pageCursor = response.next_page;
    }

    expect(data.map((item) => item.modlog.id)).toEqual([
      110, 109, 108, 107, 106, 105, 101, 104, 103, 102,
    ]);
    expect(
      new Set(data.map((item) => `${item.modlog.kind}:${item.modlog.id}`)),
    ).toHaveProperty("size", data.length);
    expect(pageCursor).toBeUndefined();
    expect(
      requests.map((request) => new URL(request.url).searchParams.get("limit")),
    ).toEqual(requests.map(() => "2"));
  });

  it("binds every filter and checksum to an opaque cursor before I/O", async () => {
    const { client, requests } = setup();
    const filters = {
      comment_id: 5,
      community_id: 3,
      mod_person_id: 1,
      other_person_id: 2,
      post_id: 4,
    };
    const first = await client.getModlog({ ...filters, limit: 2 });
    expect(first.next_page).toEqual(expect.any(String));
    if (typeof first.next_page !== "string") throw new Error("missing cursor");

    await client.getModlog({
      ...filters,
      limit: 2,
      page_cursor: first.next_page,
    });

    for (const mismatch of [
      { comment_id: undefined },
      { comment_id: 6 },
      { community_id: 6 },
      { mod_person_id: 6 },
      { other_person_id: 6 },
      { post_id: 6 },
    ]) {
      await expect(
        client.getModlog({
          ...filters,
          ...mismatch,
          page_cursor: first.next_page,
        }),
      ).rejects.toBeInstanceOf(InvalidPayloadError);
    }

    const last = first.next_page.at(-1)!;
    const tampered = `${first.next_page.slice(0, -1)}${last === "0" ? "1" : "0"}`;
    await expect(
      client.getModlog({ ...filters, page_cursor: tampered }),
    ).rejects.toBeInstanceOf(InvalidPayloadError);
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(
        Object.fromEntries(new URL(request.url).searchParams),
      ).toMatchObject({
        comment_id: "5",
        community_id: "3",
        mod_person_id: "1",
        other_person_id: "2",
        post_id: "4",
      });
    }
  });

  it("rejects malformed cursors and invalid limits before I/O", async () => {
    const { client, requests } = setup();

    for (const page_cursor of [
      "opaque-cursor",
      `piefed-modlog:v1:${"x".repeat(2_048)}`,
      0,
      -1,
      Number.MAX_SAFE_INTEGER,
    ]) {
      await expect(client.getModlog({ page_cursor })).rejects.toBeInstanceOf(
        InvalidPayloadError,
      );
    }
    for (const limit of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(client.getModlog({ limit })).rejects.toBeInstanceOf(
        InvalidPayloadError,
      );
    }
    for (const community_id of [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      await expect(client.getModlog({ community_id })).rejects.toBeInstanceOf(
        InvalidPayloadError,
      );
    }
    expect(requests).toEqual([]);
  });
});
