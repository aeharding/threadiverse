/**
 * Framework-agnostic fake threadiverse instance.
 *
 * Owns the request/response plumbing every consumer test suite otherwise
 * reimplements: `.well-known/nodeinfo` software discovery, a route table
 * with per-test overrides, request recording for payload assertions, and
 * adapters for `fetch` (vitest / `fetchFunction`) and Playwright
 * (`page.route`).
 *
 * Software-specific factories (e.g. `FakeLemmyV1Instance`) construct one of
 * these pre-seeded with that software's wire-format defaults.
 */

import type { z } from "zod/v4-mini";

import type { ThreadiverseClientOptions } from "../ThreadiverseClient";

import { DiscoveryCache, Nodeinfo21Payload, NodeinfoLink } from "../wellknown";

/**
 * Canonical error injection: rendered into the provider's error wire shape
 * (verified against real instances by the live error-fidelity suite).
 */
export type ErrorInjection = { code: string; status?: number };

export interface FakeInstanceOptions {
  /** Bare hostname (no scheme), e.g. `"v1.test.lemmy"` */
  host: string;
  /** Served via nodeinfo discovery, e.g. `{ name: "lemmy", version: "1.0.0-beta.1" }` */
  software: Nodeinfo21Payload["software"];
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

export interface OperationApi<Ops extends Record<string, OperationDef>> {
  /**
   * Canonical payloads of the requests an operation received (in order).
   * Only operations with a decoder; use `calls()` for wire-level access.
   */
  callsTo<Operation extends DecodableOperation<Ops>>(
    operation: Operation,
  ): PayloadOf<Ops[Operation]>[];
  /** Override an operation's response. Last call wins. */
  on: { [Operation in keyof Ops]: (responder: OperationResponder) => void };
  /** Override an operation's next response only, then fall back. */
  once: { [Operation in keyof Ops]: (responder: OperationResponder) => void };
  /**
   * Wait until an operation receives a request, then return its canonical
   * payload.
   */
  waitForPayload<Operation extends DecodableOperation<Ops>>(
    operation: Operation,
    predicate?: (payload: PayloadOf<Ops[Operation]>) => boolean,
    options?: { timeoutMs?: number },
  ): Promise<PayloadOf<Ops[Operation]>>;
}

export interface OperationDef<Payload = unknown> {
  /**
   * Reconstruct the canonical threadiverse payload from the wire request,
   * so consumer tests assert on what their app *meant* — never on routes,
   * query params, or wire body shapes. Partial where the wire is lossy.
   * Round-trip tested against the real client in threadiverse.
   */
  decode?: (call: RecordedCall) => Payload;
  route: Matcher;
}

export type OperationResponder =
  | ((call: RecordedCall) => OperationResponse | Promise<OperationResponse>)
  | OperationResponse;

export type OperationResponse = FakeResponse | { error: ErrorInjection };

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

type DecodableOperation<Ops extends Record<string, OperationDef>> = {
  [K in keyof Ops]: Ops[K]["decode"] extends (call: RecordedCall) => unknown
    ? K
    : never;
}[keyof Ops];

type PayloadOf<Def extends OperationDef> =
  Def extends OperationDef<infer Payload> ? Payload : never;

/** Response statuses that must not carry a body (fetch `Response` throws) */
const NULL_BODY_STATUSES = [204, 205, 304];

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
  fulfill(response: {
    body?: string;
    json?: unknown;
    status?: number;
  }): Promise<void>;
  request(): {
    headers(): Record<string, string>;
    method(): string;
    postData(): null | string;
    url(): string;
  };
}

interface Waiter {
  matcher: Matcher;
  predicate: (call: RecordedCall) => boolean;
  reject: (error: unknown) => void;
  resolve: (call: RecordedCall) => void;
}

export class FakeInstance {
  readonly host: string;

  readonly origin: string;

  readonly software: Nodeinfo21Payload["software"];

  #calls: RecordedCall[] = [];

  #discoveryCache: DiscoveryCache = new Map();

  #handlers = new Map<Matcher, Responder>();

  #onceQueues = new Map<Matcher, Responder[]>();

  #waiters: Waiter[] = [];

  constructor(options: FakeInstanceOptions) {
    this.host = options.host;
    this.origin = `https://${options.host}`;
    this.software = options.software;

    // Discovery is seeded through the ordinary route table, so tests can
    // override it (e.g. simulate an unreachable or unsupported instance)
    // and assert on discovery requests like any other call
    this.mock("GET /.well-known/nodeinfo", {
      json: {
        links: [
          {
            href: `${this.origin}/nodeinfo/2.1`,
            rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
          } satisfies z.input<typeof NodeinfoLink>,
        ],
      },
    });
    this.mock("GET /nodeinfo/2.1", {
      json: { software: this.software, version: "2.1" },
    });
  }

  /** All recorded requests matching `"METHOD /path"` (query ignored). */
  calls(matcher: Matcher): RecordedCall[] {
    return this.#calls.filter(
      (call) => `${call.method} ${call.pathname}` === matcher,
    );
  }

  /**
   * Options for a `ThreadiverseClient` scoped to this fake: routes fetch
   * through the instance and isolates software discovery from the
   * process-global cache (so multiple fakes for the same host — e.g.
   * different versions across tests — can't contaminate each other).
   *
   * ```ts
   * const client = new ThreadiverseClient(fake.origin, fake.clientOptions());
   * ```
   */
  clientOptions(): ThreadiverseClientOptions {
    return {
      discoveryCache: this.#discoveryCache,
      fetchFunction: this.fetch,
    };
  }

  /**
   * `fetch`-compatible adapter. Prefer `clientOptions()` when constructing a
   * `ThreadiverseClient`; use this directly to install a global fetch mock.
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

    const status = result.status ?? 200;

    if (NULL_BODY_STATUSES.includes(status))
      return new Response(null, { status });

    return Response.json(result.json, { status });
  };

  /**
   * Resolve a request against the route table.
   *
   * Returns `undefined` for requests to other origins (callers decide
   * whether to pass those through). Unmocked same-origin requests are
   * answered with a loud 404 instead of escaping to the real network.
   */
  async handle(request: FakeRequest): Promise<FakeResponse | undefined> {
    const url = new URL(request.url);

    if (url.origin !== this.origin) return undefined;

    const call: RecordedCall = {
      body: parseBody(request.body ?? null),
      headers: request.headers ?? {},
      method: request.method,
      pathname: url.pathname,
      query: url.searchParams,
    };
    this.#calls.push(call);
    this.#notifyWaiters(call);

    const matcher = `${request.method} ${url.pathname}` as Matcher;

    const onceQueue = this.#onceQueues.get(matcher);
    const responder = onceQueue?.length
      ? onceQueue.shift()
      : this.#handlers.get(matcher);

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

      const status = result.status ?? 200;

      if (NULL_BODY_STATUSES.includes(status))
        return route.fulfill({ body: "", status });

      return route.fulfill({ json: result.json, status });
    });
  }

  /** Set (or replace) the response for an endpoint. Last call wins. */
  mock(matcher: Matcher, responder: Responder): void {
    this.#handlers.set(matcher, responder);
  }

  /** Respond once for an endpoint, then fall back to the standing mock. */
  mockOnce(matcher: Matcher, responder: Responder): void {
    const queue = this.#onceQueues.get(matcher) ?? [];
    queue.push(responder);
    this.#onceQueues.set(matcher, queue);
  }

  /**
   * Wait until a matching request is recorded, then return the latest.
   * Resolution is push-based (no polling), so pending waiters settle the
   * moment the request lands — only the timeout path needs real timers.
   */
  async waitForCall(
    matcher: Matcher,
    predicate: (call: RecordedCall) => boolean = () => true,
    { timeoutMs = 5000 } = {},
  ): Promise<RecordedCall> {
    const existing = this.calls(matcher).filter(predicate).at(-1);
    if (existing) return existing;

    return new Promise<RecordedCall>((resolve, reject) => {
      const waiter: Waiter = {
        matcher,
        predicate,
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
        resolve: (call) => {
          clearTimeout(timer);
          resolve(call);
        },
      };

      const timer = setTimeout(() => {
        this.#removeWaiter(waiter);
        reject(new Error(`Timed out waiting for ${matcher}`));
      }, timeoutMs);

      this.#waiters.push(waiter);
    });
  }

  /**
   * Build the operation-level API (`on`/`once`/`callsTo`/`waitForPayload`)
   * from a provider's operation definitions plus its error wire renderer.
   */
  protected buildOperationApi<Ops extends Record<string, OperationDef>>(
    operations: Ops,
    renderError: (error: ErrorInjection) => FakeResponse,
  ): OperationApi<Ops> {
    const toResponder = (responder: OperationResponder): Responder => {
      const render = (response: OperationResponse): FakeResponse =>
        "error" in response ? renderError(response.error) : response;

      return typeof responder === "function"
        ? async (call) => render(await responder(call))
        : render(responder);
    };

    const on = {} as OperationApi<Ops>["on"];
    const once = {} as OperationApi<Ops>["once"];

    for (const operation of Object.keys(operations) as (keyof Ops)[]) {
      on[operation] = (responder) =>
        this.mock(operations[operation]!.route, toResponder(responder));
      once[operation] = (responder) =>
        this.mockOnce(operations[operation]!.route, toResponder(responder));
    }

    const decoderFor = (operation: keyof Ops) => {
      const decode = operations[operation]!.decode;
      if (!decode)
        throw new Error(
          `${String(operation)} has no payload decoder — use calls() for wire-level access`,
        );
      return decode;
    };

    return {
      callsTo: (operation) => {
        const decode = decoderFor(operation);
        return this.calls(operations[operation]!.route).map(
          (call) => decode(call) as never,
        );
      },
      on,
      once,
      waitForPayload: async (operation, predicate, options) => {
        const decode = decoderFor(operation);
        const call = await this.waitForCall(
          operations[operation]!.route,
          predicate ? (call) => predicate(decode(call) as never) : undefined,
          options,
        );
        return decode(call) as never;
      },
    };
  }

  #notifyWaiters(call: RecordedCall): void {
    for (const waiter of [...this.#waiters]) {
      if (`${call.method} ${call.pathname}` !== waiter.matcher) continue;

      let matches: boolean;
      try {
        matches = waiter.predicate(call);
      } catch (error) {
        // A throwing predicate is the waiter's bug — reject that waiter
        // instead of failing the unrelated request being handled
        this.#removeWaiter(waiter);
        waiter.reject(error);
        continue;
      }

      if (matches) {
        this.#removeWaiter(waiter);
        waiter.resolve(call);
      }
    }
  }

  #removeWaiter(waiter: Waiter): void {
    const index = this.#waiters.indexOf(waiter);
    if (index !== -1) this.#waiters.splice(index, 1);
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
