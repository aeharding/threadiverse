import { FakeInstance, Matcher, OperationApi } from "../FakeInstance";
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

/**
 * Operation → route map (threadiverse `BaseClient` endpoint names; routes
 * from the piefed adapter). Powers `on`/`once`/`callsTo`.
 */
const PIEFED_ROUTES = {
  createComment: "POST /api/alpha/comment",
  createPost: "POST /api/alpha/post",
  createPrivateMessage: "POST /api/alpha/private_message",
  deleteComment: "POST /api/alpha/comment/delete",
  deletePost: "POST /api/alpha/post/delete",
  editComment: "PUT /api/alpha/comment",
  editPost: "PUT /api/alpha/post",
  followCommunity: "POST /api/alpha/community/follow",
  getComments: "GET /api/alpha/comment/list",
  getCommunity: "GET /api/alpha/community",
  getPersonDetails: "GET /api/alpha/user",
  getPost: "GET /api/alpha/post",
  getPosts: "GET /api/alpha/post/list",
  getSite: "GET /api/alpha/site",
  getUnreadCount: "GET /api/alpha/user/unread_count",
  likeComment: "POST /api/alpha/comment/like",
  likePost: "POST /api/alpha/post/like",
  login: "POST /api/alpha/user/login",
  markPostAsRead: "POST /api/alpha/post/mark_as_read",
  resolveObject: "GET /api/alpha/resolve_object",
  saveComment: "PUT /api/alpha/comment/save",
  savePost: "PUT /api/alpha/post/save",
  search: "GET /api/alpha/search",
} satisfies Record<string, Matcher>;

export type PiefedOperation = keyof typeof PIEFED_ROUTES;

const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
};

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

  /** Recorded requests for an operation (by name, not route) */
  readonly callsTo: OperationApi<PiefedOperation>["callsTo"];

  /** Override an operation's response (canonical `{ error }` supported) */
  readonly on: OperationApi<PiefedOperation>["on"];

  /** Override an operation's next response only, then fall back */
  readonly once: OperationApi<PiefedOperation>["once"];

  /** Semantic content store the default routes are derived from */
  readonly seed = new SeedStore();

  /** Wait until a request for an operation is recorded */
  readonly waitForCallTo: OperationApi<PiefedOperation>["waitForCallTo"];

  constructor({
    host = "piefed.test",
    version = DEFAULT_PIEFED_VERSION,
  }: FakePiefedInstanceOptions = {}) {
    super({ host, software: { name: "piefed", version } });

    const build = createPiefedBuilders({ host, version });
    this.build = build;
    const seed = this.seed;

    const api = this.buildOperationApi(PIEFED_ROUTES, (error) => {
      const status = error.status ?? 400;
      return {
        json: {
          code: status,
          message: error.code,
          status: STATUS_TEXT[status] ?? "Error",
        },
        status,
      };
    });
    this.callsTo = api.callsTo;
    this.on = api.on;
    this.once = api.once;
    this.waitForCallTo = api.waitForCallTo;

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

    // Seed misses render PieFed's real error responses as observed live
    // (piefed.social 2026-07-02): 400s whose message is prose, mapped to
    // NotFoundError in the condition table. Verified by the fidelity suite.
    const notFound = {
      json: {
        code: 400,
        message: "No row was found when one was required",
        status: "Not found",
      },
      status: 400,
    } as const;

    const communityNotFound = {
      json: {
        code: 400,
        message: "error - unknown community. Please wait a sec and try again.",
        status: "Bad Request",
      },
      status: 400,
    } as const;

    // Observed live: piefed answers unauthenticated account endpoints with
    // 400 incorrect_login
    const unauthenticated = {
      json: { code: 400, message: "incorrect_login", status: "Bad Request" },
      status: 400,
    } as const;

    this.mock("GET /api/alpha/site", () => ({
      json: build.getSiteResponse({ name: seed.siteName }),
    }));

    this.mock("GET /api/alpha/post/list", (call) => {
      // The piefed adapter implements listPersonContent via person_id here
      const personId = call.query.get("person_id");
      const posts = personId
        ? seed.posts.filter((post) => post.creator.id === Number(personId))
        : seed.posts;
      return { json: build.postListResponse(posts.map(postView)) };
    });

    this.mock("GET /api/alpha/post", (call) => {
      const post = seed.posts.find(
        (candidate) => candidate.id === Number(call.query.get("id")),
      );
      return post ? { json: { post_view: postView(post) } } : notFound;
    });

    this.mock("GET /api/alpha/comment/list", (call) => {
      const postId = call.query.get("post_id");
      // The piefed adapter implements listPersonContent via person_id here
      const personId = call.query.get("person_id");
      let comments = seed.comments;
      if (postId)
        comments = comments.filter(
          (comment) => comment.post.id === Number(postId),
        );
      if (personId)
        comments = comments.filter(
          (comment) => comment.creator.id === Number(personId),
        );
      return { json: build.commentListResponse(comments.map(commentView)) };
    });

    this.mock("GET /api/alpha/community", (call) => {
      const name = call.query.get("name")?.split("@")[0];
      const found = seed.communities.find(
        (candidate) => candidate.name === name,
      );
      return found
        ? { json: build.communityResponse({ community: community(found) }) }
        : communityNotFound;
    });

    this.mock("GET /api/alpha/user/unread_count", () => {
      if (!seed.loggedInPerson) return unauthenticated;
      return {
        json: {
          mentions: seed.notifications.filter(
            (notification) =>
              notification.kind === "mention" && !notification.read,
          ).length,
          other: 0,
          private_messages: seed.notifications.filter(
            (notification) =>
              notification.kind === "private_message" && !notification.read,
          ).length,
          replies: seed.notifications.filter(
            (notification) =>
              notification.kind === "reply" && !notification.read,
          ).length,
        },
      };
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
