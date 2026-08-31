import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import type { components, paths } from "../src/providers/piefed/schema";

type ActiveMethod<Path extends keyof paths> = {
  [Method in HttpMethod]: Method extends keyof paths[Path]
    ? Exclude<paths[Path][Method], undefined> extends never
      ? never
      : Method
    : never;
}[HttpMethod];
type Assert<Condition extends true> = Condition;
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type HttpMethod =
  | "delete"
  | "get"
  | "head"
  | "options"
  | "patch"
  | "post"
  | "put"
  | "trace";
type Operation<Path extends keyof paths, Method extends keyof paths[Path]> =
  Exclude<paths[Path][Method], undefined> extends never
    ? never
    : { method: Method; path: Path };

const reportOperations = [
  {
    method: "get",
    path: "/api/alpha/comment/report/list",
  } satisfies Operation<"/api/alpha/comment/report/list", "get">,
  {
    method: "put",
    path: "/api/alpha/comment/report/resolve",
  } satisfies Operation<"/api/alpha/comment/report/resolve", "put">,
  {
    method: "get",
    path: "/api/alpha/post/report/list",
  } satisfies Operation<"/api/alpha/post/report/list", "get">,
  {
    method: "put",
    path: "/api/alpha/post/report/resolve",
  } satisfies Operation<"/api/alpha/post/report/resolve", "put">,
] as const;

type CommentListResponse =
  paths["/api/alpha/comment/report/list"]["get"]["responses"][200]["content"]["application/json"];
type CommentResolveBody =
  paths["/api/alpha/comment/report/resolve"]["put"]["requestBody"]["content"]["application/json"];
type PostListResponse =
  paths["/api/alpha/post/report/list"]["get"]["responses"][200]["content"]["application/json"];
type PostResolveBody =
  paths["/api/alpha/post/report/resolve"]["put"]["requestBody"]["content"]["application/json"];
type SiteAdminFlag = components["schemas"]["PersonView"]["is_admin"];
type SiteAdmins = components["schemas"]["GetSiteResponse"]["admins"];
type SiteDownvotes = components["schemas"]["Site"]["enable_downvotes"];

const compileContracts: [
  Assert<Equal<ActiveMethod<"/api/alpha/comment/report/list">, "get">>,
  Assert<Equal<ActiveMethod<"/api/alpha/comment/report/resolve">, "put">>,
  Assert<Equal<ActiveMethod<"/api/alpha/post/report/list">, "get">>,
  Assert<Equal<ActiveMethod<"/api/alpha/post/report/resolve">, "put">>,
  Assert<
    Equal<
      keyof NonNullable<
        paths["/api/alpha/comment/report/list"]["get"]["parameters"]["query"]
      >,
      "comment_id" | "community_id" | "limit" | "page" | "unresolved_only"
    >
  >,
  Assert<
    Equal<
      keyof NonNullable<
        paths["/api/alpha/post/report/list"]["get"]["parameters"]["query"]
      >,
      "community_id" | "limit" | "page" | "post_id" | "unresolved_only"
    >
  >,
] = [true, true, true, true, true, true];
const requestFixtures = [
  { report_id: 1, resolved: true } satisfies CommentResolveBody,
  { report_id: 2, resolved: false } satisfies PostResolveBody,
];
const responseFixtures = [
  { comment_reports: [] } satisfies CommentListResponse,
  { post_reports: [] } satisfies PostListResponse,
];
const siteCompileContracts: [
  Assert<Equal<SiteAdminFlag, boolean>>,
  Assert<Equal<SiteAdmins, components["schemas"]["PersonView"][]>>,
  Assert<Equal<SiteDownvotes, boolean | undefined>>,
] = [true, true, true];

interface OpenApiSnapshot {
  paths: Record<string, Record<string, unknown>>;
}

const httpMethods = new Set<HttpMethod>([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace",
]);

describe("PieFed generated schema contract", () => {
  it("contains the report list and resolve operations at compile time", () => {
    expect(compileContracts).toEqual([true, true, true, true, true, true]);
    expect(reportOperations).toHaveLength(4);
    expect(requestFixtures).toEqual([
      { report_id: 1, resolved: true },
      { report_id: 2, resolved: false },
    ]);
    expect(responseFixtures).toEqual([
      { comment_reports: [] },
      { post_reports: [] },
    ]);
  });

  it("pins the getSite admin and downvote signals", () => {
    expect(siteCompileContracts).toEqual([true, true, true]);
  });

  it("matches the report operation inventory in the reviewed snapshot", async () => {
    const bytes = await readFile(
      new URL("../src/providers/piefed/openapi.snapshot.json", import.meta.url),
    );
    const snapshot = JSON.parse(bytes.toString("utf8")) as OpenApiSnapshot;
    const routePattern =
      /^\/api\/alpha\/(comment|post)\/report\/(list|resolve)$/;

    const actual = Object.entries(snapshot.paths)
      .filter(([path]) => routePattern.test(path))
      .flatMap(([path, pathItem]) =>
        Object.keys(pathItem)
          .filter((method): method is HttpMethod =>
            httpMethods.has(method as HttpMethod),
          )
          .map((method) => ({ method, path })),
      )
      .sort((left, right) =>
        `${left.path}:${left.method}`.localeCompare(
          `${right.path}:${right.method}`,
        ),
      );

    expect(actual).toEqual(reportOperations);
  });
});
