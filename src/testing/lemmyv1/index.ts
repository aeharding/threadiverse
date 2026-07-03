import type { BaseClient } from "../../BaseClient";

import {
  FakeInstance,
  OperationApi,
  OperationDef,
  RecordedCall,
} from "../FakeInstance";
import {
  SeedComment,
  SeedCommunity,
  SeedNotification,
  SeedPerson,
  SeedPost,
  SeedStore,
} from "../seed";
import {
  createLemmyV1Builders,
  DEFAULT_VERSION,
  LemmyV1Builders,
} from "./builders";

/**
 * Canonical payload shape for a threadiverse endpoint (partial: some wire
 * requests are lossy, e.g. v1 drops `kind` from markNotificationAsRead).
 */
type Payload<K extends keyof BaseClient> = Partial<
  Parameters<BaseClient[K]>[0]
>;

/** v1 request bodies are canonical passthrough for most write endpoints */
const body =
  <K extends keyof BaseClient>() =>
  (call: RecordedCall) =>
    call.body as Payload<K>;

function numberish(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}

function query(call: RecordedCall): Record<string, string> {
  return Object.fromEntries(call.query);
}

/**
 * Operation definitions (threadiverse `BaseClient` endpoint names; routes
 * verified against lemmy-js-client-v1; decoders reconstruct canonical
 * payloads from the wire, round-trip tested in
 * test/testing-request-decoders.test.ts). Powers `on`/`once`/`callsTo`/
 * `waitForPayload`.
 */
const LEMMY_V1_OPERATIONS = {
  createComment: {
    decode: body<"createComment">(),
    route: "POST /api/v4/comment",
  },
  createPost: { decode: body<"createPost">(), route: "POST /api/v4/post" },
  createPrivateMessage: {
    decode: body<"createPrivateMessage">(),
    route: "POST /api/v4/private_message",
  },
  deleteComment: {
    decode: body<"deleteComment">(),
    route: "DELETE /api/v4/comment",
  },
  deletePost: { decode: body<"deletePost">(), route: "DELETE /api/v4/post" },
  editComment: { decode: body<"editComment">(), route: "PUT /api/v4/comment" },
  editPost: { decode: body<"editPost">(), route: "PUT /api/v4/post" },
  followCommunity: {
    decode: body<"followCommunity">(),
    route: "POST /api/v4/community/follow",
  },
  getComments: {
    decode: (call: RecordedCall): Payload<"getComments"> => {
      const q = query(call);
      return {
        limit: numberish(q.limit),
        max_depth: numberish(q.max_depth),
        page_cursor: q.page_cursor,
        parent_id: numberish(q.parent_id),
        post_id: numberish(q.post_id),
        sort: q.sort,
      } as Payload<"getComments">;
    },
    route: "GET /api/v4/comment/list",
  },
  getCommunity: {
    decode: (call: RecordedCall): Payload<"getCommunity"> => ({
      name: query(call).name,
    }),
    route: "GET /api/v4/community",
  },
  getModlog: { route: "GET /api/v4/modlog" },
  getNotifications: {
    decode: (call: RecordedCall): Payload<"getNotifications"> => {
      const q = query(call);
      return {
        limit: numberish(q.limit),
        unread_only:
          q.unread_only === undefined ? undefined : q.unread_only === "true",
      };
    },
    route: "GET /api/v4/account/notification/list",
  },
  getPersonDetails: {
    decode: (call: RecordedCall): Payload<"getPersonDetails"> => ({
      username: query(call).username,
    }),
    route: "GET /api/v4/person",
  },
  getPost: {
    decode: (call: RecordedCall): Payload<"getPost"> => ({
      id: numberish(query(call).id),
    }),
    route: "GET /api/v4/post",
  },
  getPosts: {
    decode: (call: RecordedCall): Payload<"getPosts"> => {
      const q = query(call);
      return {
        community_name: q.community_name,
        limit: numberish(q.limit),
        page_cursor: q.page_cursor,
        sort: q.sort,
        // v1 wire listing types are already canonical lowercase
        type_: q.type_,
      } as Payload<"getPosts">;
    },
    route: "GET /api/v4/post/list",
  },
  getRandomCommunity: { route: "GET /api/v4/community/random" },
  getSite: { route: "GET /api/v4/site" },
  getSiteMetadata: {
    decode: (call: RecordedCall): Payload<"getSiteMetadata"> => ({
      url: query(call).url,
    }),
    route: "GET /api/v4/post/site_metadata",
  },
  getUnreadCount: { route: "GET /api/v4/account/unread_counts" },
  likeComment: {
    decode: body<"likeComment">(),
    route: "POST /api/v4/comment/like",
  },
  likePost: { decode: body<"likePost">(), route: "POST /api/v4/post/like" },
  listPersonContent: {
    decode: (call: RecordedCall): Payload<"listPersonContent"> => ({
      person_id: numberish(query(call).person_id),
    }),
    route: "GET /api/v4/person/content",
  },
  login: { decode: body<"login">(), route: "POST /api/v4/account/auth/login" },
  markAllAsRead: {
    route: "POST /api/v4/account/notification/mark_as_read/all",
  },
  markNotificationAsRead: {
    // v1 drops `kind` on the wire — payload is partial
    decode: body<"markNotificationAsRead">(),
    route: "POST /api/v4/account/notification/mark_as_read",
  },
  markPostAsRead: {
    decode: body<"markPostAsRead">(),
    route: "POST /api/v4/post/mark_as_read/many",
  },
  resolveObject: {
    decode: (call: RecordedCall): Payload<"resolveObject"> => ({
      q: query(call).q,
    }),
    route: "GET /api/v4/resolve_object",
  },
  saveComment: {
    decode: body<"saveComment">(),
    route: "PUT /api/v4/comment/save",
  },
  savePost: { decode: body<"savePost">(), route: "PUT /api/v4/post/save" },
  search: {
    decode: (call: RecordedCall): Payload<"search"> => {
      const q = query(call);
      return {
        limit: numberish(q.limit),
        page_cursor: q.page_cursor,
        search_term: q.search_term,
        sort: q.sort,
        // v1 wire search types are already canonical lowercase
        type_: q.type_,
      } as Payload<"search">;
    },
    route: "GET /api/v4/search",
  },
} satisfies {
  [K in keyof BaseClient]?: OperationDef<Partial<Parameters<BaseClient[K]>[0]>>;
};

export interface FakeLemmyV1InstanceOptions {
  /** Bare hostname (no scheme) the fake instance answers for */
  host?: string;
  /** Lemmy version reported via nodeinfo and `GET /api/v4/site` */
  version?: string;
}

export type LemmyV1Operation = keyof typeof LEMMY_V1_OPERATIONS;

/**
 * `FakeInstance` for Lemmy v1 whose default routes are derived, per
 * request, from the semantic `seed` store — tests describe what exists,
 * not which endpoint returns it:
 *
 * ```ts
 * const alex = fake.seed.person({ name: "alex" });
 * fake.seed.post({ name: "Hello **world**", creator: alex });
 * fake.seed.loggedInAs(alex);
 * ```
 *
 * Derived: site, post list/detail, comment list, community, person (+
 * person content), account, unread counts, notifications, modlog. Use
 * `mock()` for error injection or endpoints outside this set, and
 * `calls()` / `waitForCall()` to assert on outgoing requests. Wire-level
 * builders stay available on `build`.
 */
export class FakeLemmyV1Instance extends FakeInstance {
  /** Wire-format builders bound to this instance's host */
  readonly build: LemmyV1Builders;

  /** Canonical payloads of the requests an operation received */
  readonly callsTo: OperationApi<typeof LEMMY_V1_OPERATIONS>["callsTo"];

  /** Override an operation's response (canonical `{ error }` supported) */
  readonly on: OperationApi<typeof LEMMY_V1_OPERATIONS>["on"];

  /** Override an operation's next response only, then fall back */
  readonly once: OperationApi<typeof LEMMY_V1_OPERATIONS>["once"];

  /** Semantic content store the default routes are derived from */
  readonly seed = new SeedStore();

  /** Wait for an operation's next request; resolves its canonical payload */
  readonly waitForPayload: OperationApi<
    typeof LEMMY_V1_OPERATIONS
  >["waitForPayload"];

  constructor({
    host = "v1.test.lemmy",
    version = DEFAULT_VERSION,
  }: FakeLemmyV1InstanceOptions = {}) {
    super({ host, software: { name: "lemmy", version } });

    const build = createLemmyV1Builders({ host, version });
    this.build = build;
    const seed = this.seed;

    const api = this.buildOperationApi(LEMMY_V1_OPERATIONS, (error) => ({
      json: { error: error.code },
      status: error.status ?? 400,
    }));
    this.callsTo = api.callsTo;
    this.on = api.on;
    this.once = api.once;
    this.waitForPayload = api.waitForPayload;

    // seed → wire
    const person = (subject: SeedPerson) =>
      build.person({
        display_name: subject.displayName,
        id: subject.id,
        name: subject.name,
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
        name: subject.name,
        url: subject.url,
      });
    const commentView = (subject: SeedComment) =>
      build.commentView({
        child_count: subject.childCount,
        content: subject.content,
        creator: person(subject.creator),
        id: subject.id,
        path: subject.path,
        post: postView(subject.post),
        published_at: subject.published,
      });
    const notificationView = (subject: SeedNotification) =>
      subject.kind === "private_message"
        ? build.privateMessageNotification({
            id: subject.id,
            message: build.privateMessageView({
              content: subject.message.content,
              creator: person(subject.message.creator),
              id: subject.message.id,
              recipient: person(subject.message.recipient),
            }),
            read: subject.read,
          })
        : build.commentNotification({
            comment: commentView(subject.comment),
            id: subject.id,
            kind: subject.kind,
            read: subject.read,
            recipient_id: seed.loggedInPerson?.id ?? 0,
          });

    const notFound = { json: { error: "not_found" }, status: 404 } as const;

    this.mock("GET /api/v4/site", () => ({
      json: build.getSiteResponse({
        name: seed.siteName,
        posts: seed.posts.length,
      }),
    }));

    this.mock("GET /api/v4/post/list", () => ({
      json: build.pagedResponse(seed.posts.map(postView)),
    }));

    this.mock("GET /api/v4/post", (call) => {
      const post = seed.posts.find(
        (candidate) => candidate.id === Number(call.query.get("id")),
      );
      return post ? { json: build.postResponse(postView(post)) } : notFound;
    });

    this.mock("GET /api/v4/comment/list", (call) => {
      const postId = call.query.get("post_id");
      const parentId = call.query.get("parent_id");
      let comments = postId
        ? seed.comments.filter((comment) => comment.post.id === Number(postId))
        : seed.comments;
      // parent_id = the comment's subtree (path segments include it)
      if (parentId)
        comments = comments.filter((comment) =>
          comment.path.split(".").includes(parentId),
        );
      return { json: build.pagedResponse(comments.map(commentView)) };
    });

    this.mock("GET /api/v4/community", (call) => {
      const name = call.query.get("name")?.split("@")[0];
      const found = seed.communities.find(
        (candidate) => candidate.name === name,
      );
      return found
        ? { json: build.communityResponse({ community: community(found) }) }
        : notFound;
    });

    this.mock("GET /api/v4/person", (call) => {
      const username = call.query.get("username")?.split("@")[0];
      const found = seed.people.find(
        (candidate) => candidate.name === username,
      );
      return found ? { json: build.personResponse(person(found)) } : notFound;
    });

    this.mock("GET /api/v4/person/content", (call) => {
      const personId = Number(call.query.get("person_id"));
      const items = [
        ...seed.posts
          .filter((post) => post.creator.id === personId)
          .map((post) => ({ type_: "post" as const, ...postView(post) })),
        ...seed.comments
          .filter((comment) => comment.creator.id === personId)
          .map((comment) => ({
            type_: "comment" as const,
            ...commentView(comment),
          })),
      ];
      return { json: build.pagedResponse(items) };
    });

    this.mock("GET /api/v4/modlog", () => ({
      json: build.pagedResponse([]),
    }));

    // Observed live: lemmy answers unauthenticated account endpoints with
    // 401 incorrect_login
    const unauthenticated = {
      json: { error: "incorrect_login" },
      status: 401,
    } as const;

    this.mock("GET /api/v4/account", () =>
      seed.loggedInPerson
        ? { json: build.myUserInfo({ person: person(seed.loggedInPerson) }) }
        : unauthenticated,
    );

    this.mock("GET /api/v4/account/unread_counts", () =>
      seed.loggedInPerson
        ? { json: { notification_count: seed.unreadNotificationCount } }
        : unauthenticated,
    );

    this.mock("GET /api/v4/account/notification/list", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const type = call.query.get("type_");
      let notifications =
        type && type !== "all"
          ? seed.notifications.filter((notification) =>
              type === "private_message"
                ? notification.kind === "private_message"
                : notification.kind === type,
            )
          : seed.notifications;
      if (call.query.get("unread_only") === "true")
        notifications = notifications.filter(
          (notification) => !notification.read,
        );
      return {
        json: build.pagedResponse(notifications.map(notificationView)),
      };
    });

    // Fire-and-forget side effect of many logged-in interactions
    this.mock("POST /api/v4/post/mark_as_read/many", {
      json: { success: true },
    });

    // Write routes mutate the seed store, so derived unread counts and
    // notification lists reflect the change on subsequent reads
    this.mock("POST /api/v4/account/notification/mark_as_read", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { notification_id, read } = call.body as {
        notification_id: number;
        read: boolean;
      };
      const notification = seed.notifications.find(
        (candidate) => candidate.id === notification_id,
      );
      if (notification) notification.read = read;
      return { json: { success: true } };
    });

    this.mock("POST /api/v4/account/notification/mark_as_read/all", () => {
      if (!seed.loggedInPerson) return unauthenticated;
      for (const notification of seed.notifications) notification.read = true;
      return { json: { success: true } };
    });
  }
}

export * from "./builders";
