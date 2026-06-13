import type * as LemmyV1 from "lemmy-js-client-v1";

import type { Wire } from "../wire";

import { FakeInstance } from "../FakeInstance";
import {
  createLemmyV1Builders,
  DEFAULT_VERSION,
  LemmyV1Builders,
} from "./builders";

export interface FakeLemmyV1InstanceOptions {
  /** Seed for `GET /api/v4/comment/list` (default: none) */
  comments?: Wire<LemmyV1.CommentView>[];
  /** Bare hostname (no scheme) the fake instance answers for */
  host?: string;
  /** Seed for `GET /api/v4/modlog` (default: none) */
  modlog?: Wire<LemmyV1.ModlogView>[];
  /** Seed for `GET /api/v4/post/list` (default: none) */
  posts?: Wire<LemmyV1.PostView>[];
  /** Lemmy version reported via nodeinfo and `GET /api/v4/site` */
  version?: string;
}

export class FakeLemmyV1Instance extends FakeInstance {
  /** Wire-format builders bound to this instance's host */
  readonly build: LemmyV1Builders;

  constructor({
    comments = [],
    host = "v1.test.lemmy",
    modlog = [],
    posts = [],
    version = DEFAULT_VERSION,
  }: FakeLemmyV1InstanceOptions = {}) {
    super({ host, software: { name: "lemmy", version } });

    const build = createLemmyV1Builders({ host, version });
    this.build = build;

    // Everything the v1 path touches at app startup
    this.mock("GET /api/v4/site", {
      json: build.getSiteResponse({ posts: posts.length }),
    });
    this.mock("GET /api/v4/post/list", {
      json: build.pagedResponse(posts),
    });
    this.mock("GET /api/v4/comment/list", {
      json: build.pagedResponse(comments),
    });
    this.mock("GET /api/v4/modlog", {
      json: build.pagedResponse(modlog),
    });
  }
}

export * from "./builders";
