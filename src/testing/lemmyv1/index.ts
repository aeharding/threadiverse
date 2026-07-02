import { FakeInstance } from "../FakeInstance";
import {
  createLemmyV1Builders,
  DEFAULT_VERSION,
  LemmyV1Builders,
} from "./builders";

export interface FakeLemmyV1InstanceOptions {
  /** Bare hostname (no scheme) the fake instance answers for */
  host?: string;
  /** Lemmy version reported via nodeinfo and `GET /api/v4/site` */
  version?: string;
}

/**
 * `FakeInstance` pre-seeded with the Lemmy v1 routes an app touches at
 * startup, each serving an empty default. Seed data with `mock()` and the
 * typed builders on `build`:
 *
 * ```ts
 * fake.mock("GET /api/v4/post/list", {
 *   json: fake.build.pagedResponse([fake.build.postView({ ... })]),
 * });
 * ```
 */
export class FakeLemmyV1Instance extends FakeInstance {
  /** Wire-format builders bound to this instance's host */
  readonly build: LemmyV1Builders;

  constructor({
    host = "v1.test.lemmy",
    version = DEFAULT_VERSION,
  }: FakeLemmyV1InstanceOptions = {}) {
    super({ host, software: { name: "lemmy", version } });

    const build = createLemmyV1Builders({ host, version });
    this.build = build;

    // Everything the v1 path touches at app startup. Function responders so
    // each request gets a fresh object (no shared mutable state) and nothing
    // is built unless actually requested.
    this.mock("GET /api/v4/site", () => ({ json: build.getSiteResponse() }));
    this.mock("GET /api/v4/post/list", () => ({
      json: build.pagedResponse([]),
    }));
    this.mock("GET /api/v4/comment/list", () => ({
      json: build.pagedResponse([]),
    }));
    this.mock("GET /api/v4/modlog", () => ({
      json: build.pagedResponse([]),
    }));
  }
}

export * from "./builders";
