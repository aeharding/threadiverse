import { FakeInstance } from "../FakeInstance";
import {
  SeedComment,
  SeedCommunity,
  SeedPerson,
  SeedPost,
  SeedStore,
} from "../seed";
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
 * `FakeInstance` for PieFed whose default routes are derived, per request,
 * from the semantic `seed` store — tests describe what exists, not which
 * endpoint returns it:
 *
 * ```ts
 * const alex = fake.seed.person({ name: "alex" });
 * fake.seed.post({ name: "Hello **world**", creator: alex });
 * ```
 *
 * Derived: site, post list/detail, comment list, community, person. Use
 * `mock()` for error injection or endpoints outside this set (notably the
 * notification fan-out — `GET /api/alpha/user/replies`, `/user/mentions`,
 * `/private_message/list` — which has no typed builders yet and 404s
 * loudly when unmocked). Wire-level builders stay available on `build`.
 */
export class FakePiefedInstance extends FakeInstance {
  /** Wire-format builders bound to this instance's host */
  readonly build: PiefedBuilders;

  /** Semantic content store the default routes are derived from */
  readonly seed = new SeedStore();

  constructor({
    host = "piefed.test",
    version = DEFAULT_PIEFED_VERSION,
  }: FakePiefedInstanceOptions = {}) {
    super({ host, software: { name: "piefed", version } });

    const build = createPiefedBuilders({ host, version });
    this.build = build;
    const seed = this.seed;

    // seed → wire
    const person = (subject: SeedPerson) =>
      build.person({
        id: subject.id,
        title: subject.displayName,
        user_name: subject.name,
      });
    const community = (subject: SeedCommunity) =>
      build.community({
        id: subject.id,
        name: subject.name,
        title: subject.title,
      });
    const postView = (subject: SeedPost) =>
      build.postView({
        body: subject.body,
        community: community(subject.community),
        creator: person(subject.creator),
        id: subject.id,
        title: subject.name,
        url: subject.url,
      });
    const commentView = (subject: SeedComment) =>
      build.commentView({
        body: subject.content,
        child_count: subject.childCount,
        creator: person(subject.creator),
        id: subject.id,
        path: subject.path,
        post: postView(subject.post),
        published: subject.published,
      });

    const notFound = { json: { error: "not_found" }, status: 404 } as const;

    this.mock("GET /api/alpha/site", () => ({
      json: build.getSiteResponse({ name: seed.siteName }),
    }));

    this.mock("GET /api/alpha/post/list", () => ({
      json: build.postListResponse(seed.posts.map(postView)),
    }));

    this.mock("GET /api/alpha/post", (call) => {
      const post = seed.posts.find(
        (candidate) => candidate.id === Number(call.query.get("id")),
      );
      return post ? { json: { post_view: postView(post) } } : notFound;
    });

    this.mock("GET /api/alpha/comment/list", (call) => {
      const postId = call.query.get("post_id");
      const comments = postId
        ? seed.comments.filter((comment) => comment.post.id === Number(postId))
        : seed.comments;
      return { json: build.commentListResponse(comments.map(commentView)) };
    });

    this.mock("GET /api/alpha/community", (call) => {
      const name = call.query.get("name")?.split("@")[0];
      const found = seed.communities.find(
        (candidate) => candidate.name === name,
      );
      return found
        ? { json: build.communityResponse({ community: community(found) }) }
        : notFound;
    });

    this.mock("GET /api/alpha/user", (call) => {
      const username = call.query.get("username")?.split("@")[0];
      const found = seed.people.find(
        (candidate) => candidate.name === username,
      );
      return found ? { json: build.userResponse(person(found)) } : notFound;
    });
  }
}

export * from "./builders";
