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
  SeedPerson,
  SeedPost,
  SeedPrivateMessage,
  SeedStore,
} from "../seed";
import {
  createPiefedBuilders,
  DEFAULT_PIEFED_VERSION,
  PiefedBuilders,
} from "./builders";

/** Canonical payload shape for a threadiverse endpoint (partial) */
type Payload<K extends keyof BaseClient> = Partial<
  Parameters<BaseClient[K]>[0]
>;

/** piefed request bodies that are canonical passthrough */
const body =
  <K extends keyof BaseClient>() =>
  (call: RecordedCall) =>
    call.body as Payload<K>;

// Inverse of compat's fromListingType
const LISTING_TYPE_FROM_WIRE: Record<string, Payload<"getPosts">["type_"]> = {
  All: "all",
  Local: "local",
  ModeratorView: "moderator_view",
  Subscribed: "subscribed",
};

function fromScore(score: number | undefined): boolean | undefined {
  if (score === 1) return true;
  if (score === -1) return false;
  return undefined;
}

function numberish(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}

function query(call: RecordedCall): Record<string, string> {
  return Object.fromEntries(call.query);
}

/**
 * Operation definitions (threadiverse `BaseClient` endpoint names; routes
 * from the piefed adapter; decoders reconstruct canonical payloads from the
 * wire, round-trip tested in test/testing-request-decoders.test.ts). Powers
 * `on`/`once`/`callsTo`/`waitForPayload`.
 */
const PIEFED_OPERATIONS = {
  createComment: {
    decode: (call: RecordedCall): Payload<"createComment"> => {
      // wire = canonical (spread) with content also duplicated as `body`
      const { body, ...payload } = call.body as { body: string };
      return { ...payload, content: body };
    },
    route: "POST /api/alpha/comment",
  },
  createPost: {
    decode: (call: RecordedCall): Payload<"createPost"> => {
      // wire = canonical + duplicated `title` field
      const payload = { ...(call.body as Record<string, unknown>) };
      delete payload.title;
      return payload as Payload<"createPost">;
    },
    route: "POST /api/alpha/post",
  },
  createPrivateMessage: {
    decode: body<"createPrivateMessage">(),
    route: "POST /api/alpha/private_message",
  },
  deleteComment: {
    decode: body<"deleteComment">(),
    route: "POST /api/alpha/comment/delete",
  },
  deletePost: {
    decode: body<"deletePost">(),
    route: "POST /api/alpha/post/delete",
  },
  editComment: {
    decode: (call: RecordedCall): Payload<"editComment"> => {
      // wire = canonical (spread) with content also duplicated as `body`
      const { body, ...payload } = call.body as { body: string };
      return { ...payload, content: body };
    },
    route: "PUT /api/alpha/comment",
  },
  editPost: {
    decode: (call: RecordedCall): Payload<"editPost"> => {
      // wire = canonical + duplicated `title` field
      const payload = { ...(call.body as Record<string, unknown>) };
      delete payload.title;
      return payload as Payload<"editPost">;
    },
    route: "PUT /api/alpha/post",
  },
  followCommunity: {
    decode: body<"followCommunity">(),
    route: "POST /api/alpha/community/follow",
  },
  getComments: {
    decode: (call: RecordedCall): Payload<"getComments"> => {
      const q = query(call);
      return {
        limit: numberish(q.limit),
        max_depth: numberish(q.max_depth),
        // piefed pages with numbers; canonical page_cursor is the string
        page_cursor: q.page,
        parent_id: numberish(q.parent_id),
        post_id: numberish(q.post_id),
        sort: q.sort,
      } as Payload<"getComments">;
    },
    route: "GET /api/alpha/comment/list",
  },
  getCommunity: {
    decode: (call: RecordedCall): Payload<"getCommunity"> => ({
      name: query(call).name,
    }),
    route: "GET /api/alpha/community",
  },
  getPersonDetails: {
    decode: (call: RecordedCall): Payload<"getPersonDetails"> => ({
      username: query(call).username,
    }),
    route: "GET /api/alpha/user",
  },
  getPost: {
    decode: (call: RecordedCall): Payload<"getPost"> => ({
      id: numberish(query(call).id),
    }),
    route: "GET /api/alpha/post",
  },
  getPosts: {
    decode: (call: RecordedCall): Payload<"getPosts"> => {
      const q = query(call);
      return {
        community_name: q.community_name,
        limit: numberish(q.limit),
        // piefed pages with numbers; canonical page_cursor is the string
        page_cursor: q.page,
        sort: q.sort,
        type_:
          q.type_ === undefined ? undefined : LISTING_TYPE_FROM_WIRE[q.type_],
      } as Payload<"getPosts">;
    },
    route: "GET /api/alpha/post/list",
  },
  getSite: { route: "GET /api/alpha/site" },
  getUnreadCount: { route: "GET /api/alpha/user/unread_count" },
  likeComment: {
    decode: (call: RecordedCall): Payload<"likeComment"> => {
      const wire = call.body as { comment_id: number; score?: number };
      return { comment_id: wire.comment_id, is_upvote: fromScore(wire.score) };
    },
    route: "POST /api/alpha/comment/like",
  },
  likePost: {
    decode: (call: RecordedCall): Payload<"likePost"> => {
      const wire = call.body as { post_id: number; score?: number };
      return { is_upvote: fromScore(wire.score), post_id: wire.post_id };
    },
    route: "POST /api/alpha/post/like",
  },
  login: {
    decode: (call: RecordedCall): Payload<"login"> => {
      const wire = call.body as { password: string; username: string };
      return { password: wire.password, username_or_email: wire.username };
    },
    route: "POST /api/alpha/user/login",
  },
  markAllAsRead: {
    route: "POST /api/alpha/user/mark_all_as_read",
  },
  markPostAsRead: {
    decode: body<"markPostAsRead">(),
    route: "POST /api/alpha/post/mark_as_read",
  },
  resolveObject: {
    decode: (call: RecordedCall): Payload<"resolveObject"> => ({
      q: query(call).q,
    }),
    route: "GET /api/alpha/resolve_object",
  },
  saveComment: {
    decode: body<"saveComment">(),
    route: "PUT /api/alpha/comment/save",
  },
  savePost: { decode: body<"savePost">(), route: "PUT /api/alpha/post/save" },
  search: {
    decode: (call: RecordedCall): Payload<"search"> => {
      const q = query(call);
      return {
        limit: numberish(q.limit),
        page_cursor: q.page,
        search_term: q.q,
        sort: q.sort,
        type_: q.type_?.toLowerCase(),
      } as Payload<"search">;
    },
    route: "GET /api/alpha/search",
  },
} satisfies {
  [K in keyof BaseClient]?: OperationDef<Partial<Parameters<BaseClient[K]>[0]>>;
};

export type PiefedOperation = keyof typeof PIEFED_OPERATIONS;

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
 * Derived: site, post list/detail, comment list, community, person,
 * unread counts, the notification fan-out (replies/mentions/private
 * messages), and mark-as-read writes (which mutate the seed store). Use
 * `mock()` for error injection or endpoints outside this set. Wire-level
 * builders stay available on `build`.
 */
export class FakePiefedInstance extends FakeInstance {
  /** Wire-format builders bound to this instance's host */
  readonly build: PiefedBuilders;

  /** Canonical payloads of the requests an operation received */
  readonly callsTo: OperationApi<typeof PIEFED_OPERATIONS>["callsTo"];

  /** Override an operation's response (canonical `{ error }` supported) */
  readonly on: OperationApi<typeof PIEFED_OPERATIONS>["on"];

  /** Override an operation's next response only, then fall back */
  readonly once: OperationApi<typeof PIEFED_OPERATIONS>["once"];

  /** Semantic content store the default routes are derived from */
  readonly seed = new SeedStore();

  /** Wait for an operation's next request; resolves its canonical payload */
  readonly waitForPayload: OperationApi<
    typeof PIEFED_OPERATIONS
  >["waitForPayload"];

  constructor({
    host = "piefed.test",
    version = DEFAULT_PIEFED_VERSION,
  }: FakePiefedInstanceOptions = {}) {
    super({ host, software: { name: "piefed", version } });

    const build = createPiefedBuilders({ host, version });
    this.build = build;
    const seed = this.seed;

    const api = this.buildOperationApi(PIEFED_OPERATIONS, (error) => {
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
    this.waitForPayload = api.waitForPayload;

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
        myVote: subject.myVote,
        saved: subject.saved,
        score: subject.score,
        title: subject.name,
        url: subject.url,
      });
    const commentView = (subject: SeedComment) =>
      build.commentView({
        body: subject.content,
        child_count: subject.childCount,
        creator: person(subject.creator),
        id: subject.id,
        myVote: subject.myVote,
        path: subject.path,
        post: postView(subject.post),
        published: subject.published,
        saved: subject.saved,
        score: subject.score,
      });

    // Seed misses render PieFed's real error responses as observed live
    // (piefed.social 2026-07-02): 400s whose message is prose, mapped to
    // NotFoundError in the condition table. Verified by the fidelity suite.
    // seed → wire, notifications. PieFed reuses CommentReplyView for both
    // replies and mentions; canonical notification identity is
    // comment_reply.id (mapped from the seed notification id).
    const commentReplyView = (subject: {
      comment: SeedComment;
      id: number;
      read: boolean;
    }) =>
      build.commentReplyView({
        comment: commentView(subject.comment),
        id: subject.id,
        read: subject.read,
        recipient: person(seed.loggedInPerson ?? { id: 0, name: "nobody" }),
      });
    const privateMessageView = (subject: {
      message: SeedPrivateMessage;
      read: boolean;
    }) =>
      build.privateMessageView({
        content: subject.message.content,
        creator: person(subject.message.creator),
        id: subject.message.id,
        read: subject.read,
        recipient: person(subject.message.recipient),
      });

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
      json: build.getSiteResponse({
        myUser: seed.loggedInPerson ? person(seed.loggedInPerson) : undefined,
        name: seed.siteName,
      }),
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
      const parentId = call.query.get("parent_id");
      let comments = seed.comments;
      if (postId)
        comments = comments.filter(
          (comment) => comment.post.id === Number(postId),
        );
      if (personId)
        comments = comments.filter(
          (comment) => comment.creator.id === Number(personId),
        );
      // parent_id = the comment's subtree (path segments include it)
      if (parentId)
        comments = comments.filter((comment) =>
          comment.path.split(".").includes(parentId),
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

    const unreadOnly = (call: RecordedCall) =>
      call.query.get("unread_only") === "true";

    const repliesOf = (kind: "mention" | "reply", onlyUnread: boolean) =>
      seed.notifications.flatMap((notification) =>
        notification.kind === kind && (!onlyUnread || !notification.read)
          ? [commentReplyView(notification)]
          : [],
      );

    this.mock("GET /api/alpha/user/replies", (call) =>
      seed.loggedInPerson
        ? { json: build.repliesResponse(repliesOf("reply", unreadOnly(call))) }
        : unauthenticated,
    );

    this.mock("GET /api/alpha/user/mentions", (call) =>
      seed.loggedInPerson
        ? {
            json: build.repliesResponse(repliesOf("mention", unreadOnly(call))),
          }
        : unauthenticated,
    );

    this.mock("GET /api/alpha/private_message/list", (call) =>
      seed.loggedInPerson
        ? {
            json: build.privateMessageListResponse(
              seed.notifications.flatMap((notification) =>
                notification.kind === "private_message" &&
                (!unreadOnly(call) || !notification.read)
                  ? [privateMessageView(notification)]
                  : [],
              ),
            ),
          }
        : unauthenticated,
    );

    // Vote/save writes mutate the seed store, so the returned view — and
    // every subsequent read — reflects the new state. PieFed's like body
    // carries a signed `score` (the adapter's is_upvote → 1/-1/0).
    const toVote = (score: number | undefined): -1 | 0 | 1 =>
      score === 1 ? 1 : score === -1 ? -1 : 0;

    const findPost = (id: number) =>
      seed.posts.find((candidate) => candidate.id === id);
    const findComment = (id: number) =>
      seed.comments.find((candidate) => candidate.id === id);

    this.mock("POST /api/alpha/post/like", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { post_id, score } = call.body as {
        post_id: number;
        score?: number;
      };
      const post = findPost(post_id);
      if (!post) return notFound;
      post.myVote = toVote(score);
      return { json: { post_view: postView(post) } };
    });

    this.mock("POST /api/alpha/comment/like", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { comment_id, score } = call.body as {
        comment_id: number;
        score?: number;
      };
      const comment = findComment(comment_id);
      if (!comment) return notFound;
      comment.myVote = toVote(score);
      return { json: { comment_view: commentView(comment) } };
    });

    this.mock("PUT /api/alpha/post/save", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { post_id, save } = call.body as {
        post_id: number;
        save: boolean;
      };
      const post = findPost(post_id);
      if (!post) return notFound;
      post.saved = save;
      return { json: { post_view: postView(post) } };
    });

    this.mock("PUT /api/alpha/comment/save", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { comment_id, save } = call.body as {
        comment_id: number;
        save: boolean;
      };
      const comment = findComment(comment_id);
      if (!comment) return notFound;
      comment.saved = save;
      return { json: { comment_view: commentView(comment) } };
    });

    // Mark-as-read writes mutate the seed store, so derived unread counts
    // and lists reflect them. The piefed adapter maps canonical
    // notification_id onto comment_reply_id / private_message_id.
    this.mock("POST /api/alpha/comment/mark_as_read", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { comment_reply_id, read } = call.body as {
        comment_reply_id: number;
        read: boolean;
      };
      const notification = seed.notifications.find(
        (candidate) =>
          candidate.kind !== "private_message" &&
          candidate.id === comment_reply_id,
      );
      if (notification) notification.read = read;
      return { json: { success: true } };
    });

    this.mock("POST /api/alpha/private_message/mark_as_read", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { private_message_id, read } = call.body as {
        private_message_id: number;
        read: boolean;
      };
      const notification = seed.notifications.find(
        (candidate) =>
          candidate.kind === "private_message" &&
          candidate.message.id === private_message_id,
      );
      if (notification) notification.read = read;
      return { json: { success: true } };
    });

    this.mock("POST /api/alpha/user/mark_all_as_read", () => {
      if (!seed.loggedInPerson) return unauthenticated;
      for (const notification of seed.notifications) notification.read = true;
      return { json: { success: true } };
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
