/**
 * Framework-agnostic fake threadiverse instance.
 *
 * Owns the request/response plumbing every consumer test suite otherwise
 * reimplements: `.well-known/nodeinfo` software discovery, a route table
 * with per-test overrides, request recording for payload assertions, and
 * adapters for `fetch` (vitest / `fetchFunction`) and Playwright
 * (`page.route`).
 *
 * Software-specific factories (e.g. `createFakeLemmyV1Instance`) construct
 * one of these pre-seeded with that software's wire-format defaults.
 */

export interface FakeInstanceOptions {
  /** Bare hostname (no scheme), e.g. `"v1.test.lemmy"` */
  host: string;
  /** Served via nodeinfo discovery, e.g. `{ name: "lemmy", version: "1.0.0-beta.1" }` */
  software: { name: string; version: string };
}

export type FakeRequest = {
  body?: null | string;
  headers?: Record<string, string>;
  method: string;
  url: string;
};

export type FakeResponse =
  /**
   * Simulate a network failure. The `fetch` adapter throws a `TypeError`;
   * the Playwright adapter calls `route.abort(abort)` (use a Playwright
   * error code like `"failed"` or `"timedout"`).
   */
  { abort: string } | { json: unknown; status?: number };

/** `"METHOD /path"` — matched against pathname only (query ignored) */
export type Matcher = `${"DELETE" | "GET" | "POST" | "PUT"} /${string}`;

export type RecordedCall = {
  body: unknown;
  headers: Record<string, string>;
  method: string;
  pathname: string;
  query: URLSearchParams;
};

export type Responder =
  | ((call: RecordedCall) => FakeResponse | Promise<FakeResponse>)
  | FakeResponse;

/** Structural subset of Playwright's `Page` */
interface PageLike {
  // Promise<unknown> because the return type varies by Playwright version
  // (void, then Disposable)
  route(
    url: string,
    handler: (route: RouteLike) => Promise<void>,
  ): Promise<unknown>;
}

/** Structural subset of Playwright's `Route`, to avoid a Playwright dependency */
interface RouteLike {
  abort(errorCode?: string): Promise<void>;
  fulfill(response: { json?: unknown; status?: number }): Promise<void>;
  request(): {
    headers(): Record<string, string>;
    method(): string;
    postData(): null | string;
    url(): string;
  };
}

export class FakeInstance {
  readonly host: string;

  readonly origin: string;

  readonly software: { name: string; version: string };

  #calls: RecordedCall[] = [];

  #handlers = new Map<Matcher, Responder>();

  constructor(options: FakeInstanceOptions) {
    this.host = options.host;
    this.origin = `https://${options.host}`;
    this.software = options.software;
  }

  /** All recorded API requests matching `"METHOD /path"` (query ignored). */
  calls(matcher: Matcher): RecordedCall[] {
    return this.#calls.filter(
      (call) => `${call.method} ${call.pathname}` === matcher,
    );
  }

  /**
   * `fetch`-compatible adapter. Pass as `fetchFunction` to a
   * `ThreadiverseClient`, or install as a global fetch mock in unit tests.
   * Unrouted requests and `{ abort }` responses throw `TypeError`, like a
   * real network failure.
   */
  readonly fetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);

    const result = await this.handle({
      body: ["GET", "HEAD"].includes(request.method)
        ? null
        : await request.text(),
      headers: Object.fromEntries(request.headers),
      method: request.method,
      url: request.url,
    });

    if (!result)
      throw new TypeError(
        `fetch failed: ${request.url} is not handled by this FakeInstance (host: ${this.host})`,
      );
    if ("abort" in result)
      throw new TypeError(`fetch failed: simulated abort (${result.abort})`);

    return Response.json(result.json, { status: result.status ?? 200 });
  };

  /**
   * Resolve a request against discovery routes and the mock table.
   *
   * Returns `undefined` for requests to other origins (callers decide
   * whether to pass those through). Unmocked same-origin requests are
   * answered with a loud 404 instead of escaping to the real network.
   */
  async handle(request: FakeRequest): Promise<FakeResponse | undefined> {
    const url = new URL(request.url);

    if (url.origin !== this.origin) return undefined;

    if (request.method === "GET" && url.pathname === "/.well-known/nodeinfo")
      return {
        json: {
          links: [
            {
              href: `${this.origin}/nodeinfo/2.1`,
              rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
            },
          ],
        },
      };

    if (request.method === "GET" && url.pathname === "/nodeinfo/2.1")
      return { json: { software: this.software, version: "2.1" } };

    const call: RecordedCall = {
      body: parseBody(request.body ?? null),
      headers: request.headers ?? {},
      method: request.method,
      pathname: url.pathname,
      query: url.searchParams,
    };
    this.#calls.push(call);

    const responder = this.#handlers.get(
      `${request.method} ${url.pathname}` as Matcher,
    );

    if (!responder) {
      // Surface missing mocks loudly instead of letting requests escape to
      // the real network (consumers treat this like any server error).
      console.warn(
        `[FakeInstance] unmocked request: ${request.method} ${url.pathname}${url.search}`,
      );
      return { json: { error: "not_found" }, status: 404 };
    }

    return typeof responder === "function" ? responder(call) : responder;
  }

  /**
   * Install onto a Playwright page. Routes all traffic for this instance's
   * origin; other origins are untouched.
   */
  async install(page: PageLike): Promise<void> {
    await page.route(`${this.origin}/**`, async (route) => {
      const request = route.request();

      const result = await this.handle({
        body: request.postData(),
        headers: request.headers(),
        method: request.method(),
        url: request.url(),
      });

      // handle() only returns undefined for foreign origins, which this
      // route never matches
      if (!result) throw new Error("unreachable");

      if ("abort" in result) return route.abort(result.abort);

      return route.fulfill({ json: result.json, status: result.status ?? 200 });
    });
  }

  /** Set (or replace) the response for an endpoint. Last call wins. */
  mock(matcher: Matcher, responder: Responder): void {
    this.#handlers.set(matcher, responder);
  }

  /** Wait until a matching request is recorded, then return the latest. */
  async waitForCall(
    matcher: Matcher,
    predicate: (call: RecordedCall) => boolean = () => true,
    { timeoutMs = 5000 } = {},
  ): Promise<RecordedCall> {
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const match = this.calls(matcher).filter(predicate).at(-1);
      if (match) return match;

      if (Date.now() > deadline)
        throw new Error(`Timed out waiting for ${matcher}`);

      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

function parseBody(postData: null | string): unknown {
  if (!postData) return undefined;

  try {
    return JSON.parse(postData);
  } catch {
    return postData;
  }
}
