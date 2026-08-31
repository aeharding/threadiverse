import { describe, expect, it, vi } from "vitest";

import type { components } from "../src/providers/piefed/schema";
import type { Wire } from "../src/testing/wire";
import type { CommentReportView, PostReportView } from "../src/types";

import { BaseClientOptions } from "../src/BaseClient";
import { InvalidPayloadError } from "../src/errors";
import { UnsafePiefedClient } from "../src/providers/piefed";
import * as schemas from "../src/schemas";
import { createPiefedBuilders } from "../src/testing/piefed/builders";

const BASE_URL = "https://reports.piefed.test";
const NOW = "2026-08-30T12:00:00Z";

type PiefedSchemas = components["schemas"];

function reportFixtures() {
  const build = createPiefedBuilders({
    host: "reports.piefed.test",
    now: NOW,
  });
  const community = build.community({ id: 17, name: "moderated" });
  const reporter = build.person({ id: 40, user_name: "reporter" });
  const postCreator = build.person({ id: 41, user_name: "post_author" });
  const commentCreator = build.person({
    id: 42,
    user_name: "comment_author",
  });
  const moderator = build.person({ id: 99, user_name: "auth_moderator" });
  const postView = build.postView({
    body: "Current post body",
    community,
    creator: postCreator,
    id: 70,
    score: 12,
    title: "Current post title",
  });
  const commentView = build.commentView({
    body: "Current comment text",
    creator: commentCreator,
    id: 80,
    post: postView,
    score: 5,
  });

  const commentReport = {
    activity_alert: true,
    banned_from_community: false,
    comment: commentView.comment,
    comment_creator: commentCreator,
    comment_report: {
      comment_id: commentView.comment.id,
      creator_id: reporter.id,
      description: "Contains repeated unsolicited links",
      id: 90,
      published: NOW,
      reason: "Spam",
      resolved: false,
    },
    community,
    counts: commentView.counts,
    // PieFed currently serializes the authenticated moderator here even
    // though comment_report.creator_id is the actual reporter.
    creator: moderator,
    creator_banned_from_community: false,
    creator_blocked: true,
    creator_is_admin: false,
    creator_is_moderator: false,
    my_vote: -1,
    post: postView.post,
    saved: true,
    subscribed: "Subscribed",
  } satisfies Wire<PiefedSchemas["CommentReportView"]>;

  const postReport = {
    community,
    counts: postView.counts,
    // Same upstream inconsistency as CommentReportView.creator.
    creator: moderator,
    creator_banned_from_community: true,
    creator_blocked: false,
    creator_is_admin: false,
    creator_is_moderator: true,
    post: postView.post,
    post_creator: postCreator,
    post_report: {
      creator_id: reporter.id,
      id: 91,
      // Current PieFed synthesizes this as an empty value rather than a
      // historical snapshot.
      original_post_body: "",
      // Like comment reports, current PieFed copies the current content
      // instead of retaining a historical snapshot.
      original_post_name: "Current post title",
      post_id: postView.post.id,
      reason: "Rule 2",
      resolved: true,
    },
    saved: false,
    subscribed: "Pending",
  } satisfies Wire<PiefedSchemas["PostReportView"]>;

  return { commentReport, postReport };
}

function reportIds(reports: (CommentReportView | PostReportView)[]) {
  return reports.map((report) =>
    "comment_report" in report
      ? `comment:${report.comment_report.id}`
      : `post:${report.post_report.id}`,
  );
}

function setup() {
  const fixtures = reportFixtures();
  const requests: Request[] = [];
  const fetchFunction = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      const pathname = new URL(request.url).pathname;

      const json =
        pathname === "/api/alpha/comment/report/list"
          ? { comment_reports: [fixtures.commentReport], next_page: "3" }
          : pathname === "/api/alpha/post/report/list"
            ? { next_page: null, post_reports: [fixtures.postReport] }
            : {};

      return new Response(JSON.stringify(json), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    },
  ) as BaseClientOptions["fetchFunction"];
  const client = new UnsafePiefedClient(BASE_URL, {
    fetchFunction,
    headers: {},
  });

  return { client, requests };
}

function setupMergedReports(
  variant: "asymmetric" | "interleaved" = "interleaved",
) {
  const fixtures = reportFixtures();
  const requests: Request[] = [];
  const commentAt = (id: number, published: string) =>
    ({
      ...structuredClone(fixtures.commentReport),
      comment_report: {
        ...structuredClone(fixtures.commentReport.comment_report),
        id,
        published,
      },
    }) satisfies Wire<PiefedSchemas["CommentReportView"]>;
  const postAt = (id: number, published: string) =>
    ({
      ...structuredClone(fixtures.postReport),
      post_report: {
        ...structuredClone(fixtures.postReport.post_report),
        id,
        published,
      },
    }) satisfies Wire<PiefedSchemas["PostReportView"]>;

  const comments =
    variant === "interleaved"
      ? [
          {
            items: [
              commentAt(101, "2026-08-30T08:00:00Z"),
              commentAt(100, "2026-08-30T10:00:00Z"),
            ],
            next: "2",
          },
          {
            items: [commentAt(102, "2026-08-30T06:00:00Z")],
            next: null,
          },
        ]
      : [
          {
            items: [commentAt(100, "2026-08-30T10:00:00Z")],
            next: null,
          },
        ];
  const posts =
    variant === "interleaved"
      ? [
          {
            items: [
              postAt(201, "2026-08-30T07:00:00Z"),
              postAt(200, "2026-08-30T09:00:00Z"),
            ],
            next: "2",
          },
          {
            items: [postAt(202, "2026-08-30T05:00:00Z")],
            next: null,
          },
        ]
      : [
          {
            items: [
              postAt(200, "2026-08-30T09:00:00Z"),
              postAt(201, "2026-08-30T08:00:00Z"),
            ],
            next: "2",
          },
          {
            items: [postAt(202, "2026-08-30T07:00:00Z")],
            next: null,
          },
        ];

  const fetchFunction = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") ?? 1);

      if (url.pathname === "/api/alpha/comment/report/list") {
        const result = comments[page - 1] ?? { items: [], next: null };
        return Response.json({
          comment_reports: result.items,
          next_page: result.next,
        });
      }

      if (url.pathname === "/api/alpha/post/report/list") {
        const result = posts[page - 1] ?? { items: [], next: null };
        return Response.json({
          next_page: result.next,
          post_reports: result.items,
        });
      }

      throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    },
  ) as BaseClientOptions["fetchFunction"];
  const client = new UnsafePiefedClient(BASE_URL, {
    fetchFunction,
    headers: {},
  });

  return { client, requests };
}

describe("piefed report moderation", () => {
  it("lists and canonically maps comment reports with server pagination", async () => {
    const { client, requests } = setup();

    const response = await client.listCommentReports({
      limit: 25,
      page_cursor: 2,
      unresolved_only: true,
    });

    expect(schemas.ListCommentReportsResponse.safeParse(response).success).toBe(
      true,
    );
    expect(response.next_page).toBe(3);
    expect(response.data).toHaveLength(1);
    expect(response.data[0]).toMatchObject({
      comment: {
        content: "Current comment text",
        creator_id: 42,
        score: 5,
      },
      comment_report: {
        original_comment_text: "Current comment text",
        published_at: NOW,
        reason: "Spam\n\nContains repeated unsolicited links",
        resolved: false,
      },
      creator: { id: 99, name: "auth_moderator" },
      creator_blocked: true,
      my_vote: -1,
      resolver: undefined,
      subscribed: "Subscribed",
    });

    const request = requests[0]!;
    const url = new URL(request.url);
    expect(request.method).toBe("GET");
    expect(url.pathname).toBe("/api/alpha/comment/report/list");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: "25",
      page: "2",
      unresolved_only: "true",
    });
  });

  it("lists and canonically maps post reports without inventing wire state", async () => {
    const { client, requests } = setup();

    const response = await client.listPostReports({ unresolved_only: false });

    expect(schemas.ListPostReportsResponse.safeParse(response).success).toBe(
      true,
    );
    expect(response.next_page).toBeUndefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0]).toMatchObject({
      creator: { id: 99, name: "auth_moderator" },
      creator_banned_from_community: true,
      creator_is_moderator: true,
      hidden: false,
      notifications: "replies_and_mentions",
      post: { comments: 0, score: 12 },
      post_creator: { id: 41, name: "post_author" },
      post_report: {
        original_post_body: "",
        original_post_name: "Current post title",
        original_post_url: undefined,
        published_at: undefined,
        reason: "Rule 2",
        resolved: true,
      },
      read: false,
      resolver: undefined,
      subscribed: "Pending",
      tags: [],
      unread_comments: 0,
    });

    const request = requests[0]!;
    const url = new URL(request.url);
    expect(request.method).toBe("GET");
    expect(url.pathname).toBe("/api/alpha/post/report/list");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      unresolved_only: "false",
    });
  });

  it("resolves and reopens each report kind on PieFed's PUT routes", async () => {
    const { client, requests } = setup();
    const abortController = new AbortController();

    await client.resolveCommentReport(
      { report_id: 90, resolved: true },
      { signal: abortController.signal },
    );
    await client.resolvePostReport({ report_id: 91, resolved: false });

    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ["PUT", `${BASE_URL}/api/alpha/comment/report/resolve`],
      ["PUT", `${BASE_URL}/api/alpha/post/report/resolve`],
    ]);
    await expect(requests[0]!.clone().json()).resolves.toEqual({
      report_id: 90,
      resolved: true,
    });
    await expect(requests[1]!.clone().json()).resolves.toEqual({
      report_id: 91,
      resolved: false,
    });
    expect(requests[0]!.signal.aborted).toBe(false);
    abortController.abort();
    expect(requests[0]!.signal.aborted).toBe(true);
  });

  it("merges independently paginated reports without duplicates while timestamps are comparable", async () => {
    const { client, requests } = setupMergedReports();
    const payload = {
      community_id: 17,
      limit: 2,
      unresolved_only: true,
    } as const;

    const first = await client.listReports(payload);
    expect(reportIds(first.data)).toEqual(["comment:100", "post:200"]);
    expect(first.next_page).toEqual(expect.any(String));

    const second = await client.listReports({
      ...payload,
      page_cursor: first.next_page,
    });
    expect(reportIds(second.data)).toEqual(["comment:101", "post:201"]);
    expect(second.next_page).toEqual(expect.any(String));

    const third = await client.listReports({
      ...payload,
      page_cursor: second.next_page,
    });
    expect(reportIds(third.data)).toEqual(["comment:102", "post:202"]);
    expect(third.next_page).toBeUndefined();

    expect(requests).toHaveLength(7);
    for (const request of requests) {
      const query = new URL(request.url).searchParams;
      expect(query.get("community_id")).toBe("17");
      expect(query.get("limit")).toBe("2");
      expect(query.get("unresolved_only")).toBe("true");
    }
    expect(
      requests.map((request) => new URL(request.url).searchParams.get("page")),
    ).toEqual(["1", "1", "1", "1", "2", "2", "2"]);
  });

  it("continues the remaining report feed after asymmetric exhaustion", async () => {
    const { client, requests } = setupMergedReports("asymmetric");

    const first = await client.listReports({ limit: 2 });
    const second = await client.listReports({
      limit: 2,
      page_cursor: first.next_page,
    });

    expect(reportIds(first.data)).toEqual(["comment:100", "post:200"]);
    expect(reportIds(second.data)).toEqual(["post:201", "post:202"]);
    expect(second.next_page).toBeUndefined();
    expect(
      requests.filter((request) =>
        request.url.includes("/comment/report/list"),
      ),
    ).toHaveLength(1);
    expect(
      requests
        .filter((request) => request.url.includes("/post/report/list"))
        .map((request) => new URL(request.url).searchParams.get("page")),
    ).toEqual(["1", "1", "2"]);
  });

  it("round-robins unknown report timestamps so one kind cannot starve", async () => {
    const { client } = setup();

    const first = await client.listReports({ limit: 1 });
    const second = await client.listReports({
      limit: 1,
      page_cursor: first.next_page,
    });

    expect(reportIds(first.data)).toEqual(["comment:90"]);
    expect(reportIds(second.data)).toEqual(["post:91"]);
  });

  it("pins the upstream batch while allowing a smaller resumed page", async () => {
    const { client, requests } = setupMergedReports();
    const first = await client.listReports({ limit: 2 });
    const firstCallCount = requests.length;

    const resumed = await client.listReports({
      limit: 1,
      page_cursor: first.next_page,
    });

    expect(reportIds(resumed.data)).toEqual(["comment:101"]);
    expect(requests.slice(firstCallCount)).toHaveLength(2);
    for (const request of requests.slice(firstCallCount))
      expect(new URL(request.url).searchParams.get("limit")).toBe("2");
  });

  it("accepts numeric starting pages and rejects invalid limits before I/O", async () => {
    const { client, requests } = setupMergedReports();

    const response = await client.listReports({
      limit: 1,
      page_cursor: 2,
    });
    expect(reportIds(response.data)).toEqual(["comment:102"]);
    expect(
      requests.map((request) => new URL(request.url).searchParams.get("page")),
    ).toEqual(["2", "2"]);

    const callCount = requests.length;
    await expect(client.listReports({ limit: 0 })).rejects.toBeInstanceOf(
      InvalidPayloadError,
    );
    await expect(client.listReports({ limit: 1.5 })).rejects.toBeInstanceOf(
      InvalidPayloadError,
    );
    expect(requests).toHaveLength(callCount);
  });

  it("rejects foreign, tampered, and filter-mismatched merged cursors", async () => {
    const { client, requests } = setupMergedReports();
    const first = await client.listReports({
      community_id: 17,
      limit: 1,
      unresolved_only: true,
    });
    const callCount = requests.length;

    await expect(
      client.listReports({ limit: 1, page_cursor: "not-ours" }),
    ).rejects.toBeInstanceOf(InvalidPayloadError);
    await expect(
      client.listReports({
        community_id: 17,
        limit: 1,
        page_cursor: `${String(first.next_page).slice(0, -1)}x`,
        unresolved_only: true,
      }),
    ).rejects.toBeInstanceOf(InvalidPayloadError);
    await expect(
      client.listReports({
        community_id: 18,
        limit: 1,
        page_cursor: first.next_page,
        unresolved_only: true,
      }),
    ).rejects.toThrow("Invalid PieFed report page cursor");
    await expect(
      client.listReports({
        community_id: 17,
        limit: 1,
        page_cursor: first.next_page,
        unresolved_only: false,
      }),
    ).rejects.toThrow("Invalid PieFed report page cursor");
    expect(requests).toHaveLength(callCount);
  });
});
