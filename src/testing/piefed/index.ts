import { FakeInstance } from "../FakeInstance";
import {
  createPiefedBuilders,
  DEFAULT_PIEFED_VERSION,
  PiefedBuilders,
} from "./builders";

export interface FakePiefedInstanceOptions {
  /** Bare hostname (no scheme) the fake instance answers for */
  host?: string;
  /** PieFed version reported via nodeinfo and `GET /api/alpha/site` */
  version?: string;
}

/**
 * `FakeInstance` pre-seeded with the PieFed routes an app touches at
 * startup, each serving an empty default. Seed data with `mock()` and the
 * typed builders on `build`:
 *
 * ```ts
 * fake.mock("GET /api/alpha/post/list", {
 *   json: { next_page: null, posts: [fake.build.postView({ ... })] },
 * });
 * ```
 */
export class FakePiefedInstance extends FakeInstance {
  /** Wire-format builders bound to this instance's host */
  readonly build: PiefedBuilders;

  constructor({
    host = "piefed.test",
    version = DEFAULT_PIEFED_VERSION,
  }: FakePiefedInstanceOptions = {}) {
    super({ host, software: { name: "piefed", version } });

    const build = createPiefedBuilders({ host, version });
    this.build = build;

    // Everything the piefed path touches at app startup. Function responders
    // so each request gets a fresh object (no shared mutable state) and
    // nothing is built unless actually requested.
    this.mock("GET /api/alpha/site", () => ({
      json: build.getSiteResponse(),
    }));
    this.mock("GET /api/alpha/post/list", () => ({
      json: { next_page: null, posts: [] },
    }));
    this.mock("GET /api/alpha/comment/list", () => ({
      json: { comments: [], next_page: null },
    }));
  }
}

export * from "./builders";
