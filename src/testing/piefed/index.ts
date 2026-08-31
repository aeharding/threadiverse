import type { BaseClient } from "../../BaseClient";

import {
  FakeInstance,
  OperationApi,
  OperationDef,
  RecordedCall,
} from "../FakeInstance";
import { depthOf, paginateByPage } from "../pagination";
import { searchSeed, SeedSearchType } from "../search";
import {
  SeedComment,
  SeedCommunity,
  SeedNotification,
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
  createPrivateMessageReport: {
    decode: body<"createPrivateMessageReport">(),
    route: "POST /api/alpha/private_message/report",
  },
  deleteComment: {
    decode: body<"deleteComment">(),
    route: "POST /api/alpha/comment/delete",
  },
  deleteImage: {
    decode: (call: RecordedCall): Payload<"deleteImage"> => {
      const wire = call.body as { file: string };
      return { url: wire.file };
    },
    route: "POST /api/alpha/image/delete",
  },
  deletePost: {
    decode: body<"deletePost">(),
    route: "POST /api/alpha/post/delete",
  },
  distinguishComment: {
    decode: (call: RecordedCall): Payload<"distinguishComment"> => {
      const wire = call.body as {
        comment_reply_id: number;
        distinguished: boolean;
      };
      return {
        comment_id: wire.comment_reply_id,
        distinguished: wire.distinguished,
      };
    },
    route: "POST /api/alpha/comment/distinguish",
  },
  editComment: {
    decode: (call: RecordedCall): Payload<"editComment"> => {
      // wire = canonical (spread) with content also duplicated as `body`
      const { body, ...payload } = call.body as { body: string };
      return { ...payload, content: body };
    },
    route: "PUT /api/alpha/comment",
  },
  editCommunityNotifications: {
    decode: (call: RecordedCall): Payload<"editCommunityNotifications"> => {
      const wire = call.body as {
        community_id: number;
        subscribe: boolean;
      };
      return {
        community_id: wire.community_id,
        mode: wire.subscribe ? "all_posts" : "replies_and_mentions",
      };
    },
    route: "PUT /api/alpha/community/subscribe",
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
  editPostNotifications: {
    decode: (call: RecordedCall): Payload<"editPostNotifications"> => {
      const wire = call.body as { post_id: number; subscribe: boolean };
      return {
        mode: wire.subscribe ? "all_comments" : "replies_and_mentions",
        post_id: wire.post_id,
      };
    },
    route: "PUT /api/alpha/post/subscribe",
  },
  followCommunity: {
    decode: body<"followCommunity">(),
    route: "POST /api/alpha/community/follow",
  },
  getComments: {
    decode: (call: RecordedCall): Payload<"getComments"> => {
      const q = query(call);
      const parentId = numberish(q.parent_id);
      const wireDepth = numberish(q.max_depth);

      return {
        limit: numberish(q.limit),
        // Invert the adapter's piefed depth adjustment (see
        // toPiefedMaxDepth) so the decoded payload is canonical
        max_depth:
          wireDepth === undefined || parentId !== undefined
            ? wireDepth
            : wireDepth + 1,
        // piefed pages with numbers; canonical page_cursor is the string
        page_cursor: q.page,
        parent_id: parentId,
        post_id: numberish(q.post_id),
        sort: q.sort,
      } as Payload<"getComments">;
    },
    route: "GET /api/alpha/comment/list",
  },
  getCommunity: {
    decode: (call: RecordedCall): Payload<"getCommunity"> => {
      const q = query(call);
      return { id: numberish(q.id), name: q.name };
    },
    route: "GET /api/alpha/community",
  },
  getModlog: {
    decode: (call: RecordedCall): Payload<"getModlog"> => {
      const q = query(call);
      return {
        comment_id: numberish(q.comment_id),
        community_id: numberish(q.community_id),
        limit: numberish(q.limit),
        mod_person_id: numberish(q.mod_person_id),
        other_person_id: numberish(q.other_person_id),
        // PieFed's adapter injects page=1 when the canonical cursor is
        // omitted. That default is indistinguishable from an explicit 1,
        // so decode both as omission; later pages round-trip exactly.
        page_cursor:
          q.page === undefined || q.page === "1" ? undefined : Number(q.page),
        post_id: numberish(q.post_id),
      };
    },
    route: "GET /api/alpha/modlog",
  },
  getPersonDetails: {
    decode: (call: RecordedCall): Payload<"getPersonDetails"> => {
      const q = query(call);
      return { person_id: numberish(q.person_id), username: q.username };
    },
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
  getSiteMetadata: {
    decode: (call: RecordedCall): Payload<"getSiteMetadata"> => ({
      url: query(call).url,
    }),
    route: "GET /api/alpha/post/site_metadata",
  },
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
  resolveCommentReport: {
    decode: body<"resolveCommentReport">(),
    route: "PUT /api/alpha/comment/report/resolve",
  },
  resolveObject: {
    decode: (call: RecordedCall): Payload<"resolveObject"> => ({
      q: query(call).q,
    }),
    route: "GET /api/alpha/resolve_object",
  },
  resolvePostReport: {
    decode: body<"resolvePostReport">(),
    route: "PUT /api/alpha/post/report/resolve",
  },
  saveComment: {
    decode: body<"saveComment">(),
    route: "PUT /api/alpha/comment/save",
  },
  savePost: { decode: body<"savePost">(), route: "PUT /api/alpha/post/save" },
  saveUserSettings: {
    decode: body<"saveUserSettings">(),
    route: "PUT /api/alpha/user/save_user_settings",
  },
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

/** PieFed's capitalized wire search types (`SearchResponse.type_`) */
type PiefedSearchType = NonNullable<
  Parameters<PiefedBuilders["searchResponse"]>[0]
>["type_"];

const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  429: "Too Many Requests",
};

export interface FakePiefedInstanceOptions {
  /** Whether the fake site permits post and comment downvotes */
  enableDownvotes?: boolean;
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
 * Derived: site, post list/detail, comment list (honoring `parent_id` and
 * `max_depth`), search, community, person, unread counts, an empty public
 * modlog (schema-typed overrides are supported), the notification fan-out
 * (replies/mentions/private messages), and the vote/save/create/edit/delete/
 * mark-read writes (which mutate the store). Lists paginate by 1-based
 * `page` number, like the real server. Use
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

  /** Wait strictly for an operation's next request */
  readonly waitForNextPayload: OperationApi<
    typeof PIEFED_OPERATIONS
  >["waitForNextPayload"];

  /** Return the latest payload, or wait when none is recorded yet */
  readonly waitForPayload: OperationApi<
    typeof PIEFED_OPERATIONS
  >["waitForPayload"];

  constructor({
    enableDownvotes = true,
    host = "piefed.test",
    version = DEFAULT_PIEFED_VERSION,
  }: FakePiefedInstanceOptions = {}) {
    super({ host, software: { name: "piefed", version } });

    const build = createPiefedBuilders({ host, version });
    this.build = build;
    const seed = this.seed;
    const showNsfwByPerson = new Map<number, boolean>();

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
    this.waitForNextPayload = api.waitForNextPayload;
    this.waitForPayload = api.waitForPayload;

    // seed → wire
    const person = (subject: SeedPerson) =>
      build.person({
        id: subject.id,
        title: subject.displayName,
        user_name: subject.name,
      });
    const myUserInfo = () => {
      const subject = seed.loggedInPerson;
      if (!subject) return undefined;

      const info = build.myUserInfo(person(subject));
      info.local_user_view.local_user.show_nsfw =
        showNsfwByPerson.get(subject.id) ?? false;
      return info;
    };
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
        deleted: subject.deleted,
        id: subject.id,
        myVote: subject.myVote,
        read: subject.read,
        saved: subject.saved,
        score: subject.score,
        title: subject.name,
        url: subject.url,
      });
    const commentView = (subject: SeedComment) =>
      build.commentView({
        body: subject.content,
        child_count: seed.childCountOf(subject),
        creator: person(subject.creator),
        deleted: subject.deleted,
        id: subject.id,
        myVote: subject.myVote,
        path: subject.path,
        post: postView(subject.post),
        published: subject.published,
        saved: subject.saved,
        score: subject.score,
      });

    // PieFed pages by 1-based page number
    const pageOf = <T>(items: T[], call: RecordedCall) => {
      const limit = call.query.get("limit");
      const page = call.query.get("page");
      return paginateByPage(items, {
        limit: limit === null ? undefined : Number(limit),
        page: page === null ? undefined : Number(page),
      });
    };

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
    const genericNotificationView = (
      subject: Exclude<SeedNotification, { kind: "private_message" }>,
    ) => {
      const view = commentView(subject.comment);
      const isMention = subject.kind === "mention";
      return build.userNotificationItemView({
        author: person(subject.comment.creator),
        comment: view.comment,
        comment_id: view.comment.id,
        comment_view: isMention ? undefined : view,
        notif_body: view.comment.body,
        notif_id: subject.id,
        notif_subtype: isMention
          ? "comment_mention"
          : "new_reply_on_followed_comment",
        notif_type: isMention ? 6 : 4,
        post: isMention ? undefined : postView(subject.comment.post),
        post_id: subject.comment.post.id,
        status: subject.read ? "Read" : "Unread",
      });
    };

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

    this.mock("GET /api/alpha/site", () => {
      const response = build.getSiteResponse({
        admins: seed.people
          .filter((subject) => subject.admin === true)
          .map((subject) =>
            build.personView(person(subject), { isAdmin: true }),
          ),
        enableDownvotes,
        myUser: seed.loggedInPerson ? person(seed.loggedInPerson) : undefined,
        name: seed.siteName,
      });
      const currentUser = myUserInfo();
      if (currentUser) response.my_user = currentUser;
      return { json: response };
    });

    this.mock("GET /api/alpha/user/me", () => {
      const currentUser = myUserInfo();
      return currentUser ? { json: currentUser } : unauthenticated;
    });

    this.mock("GET /api/alpha/post/list", (call) => {
      // The piefed adapter implements listPersonContent via person_id here
      const personId = call.query.get("person_id");
      let posts = personId
        ? seed.posts.filter((post) => post.creator.id === Number(personId))
        : seed.posts;
      if (call.query.get("liked_only") === "true")
        posts = posts.filter((post) => post.myVote === 1);
      const { items, nextPage } = pageOf(posts, call);
      return {
        json: build.postListResponse(items.map(postView), nextPage ?? null),
      };
    });

    this.mock("GET /api/alpha/post", (call) => {
      const post = seed.posts.find(
        (candidate) => candidate.id === Number(call.query.get("id")),
      );
      return post ? { json: { post_view: postView(post) } } : notFound;
    });

    this.mock("GET /api/alpha/comment", (call) => {
      const comment = seed.comments.find(
        (candidate) => candidate.id === Number(call.query.get("id")),
      );
      return comment
        ? { json: { comment_view: commentView(comment) } }
        : notFound;
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
      if (call.query.get("liked_only") === "true")
        comments = comments.filter((comment) => comment.myVote === 1);
      // parent_id = the comment's subtree (path segments include it)
      if (parentId)
        comments = comments.filter((comment) =>
          comment.path.split(".").includes(parentId),
        );

      // max_depth is relative to the requested parent, so fetching a
      // subtree returns that comment plus max_depth levels beneath it.
      // Verified live: with a parent PieFed matches Lemmy, but without one
      // it counts levels *below* top-level (max_depth=0 → the roots),
      // where Lemmy counts from the post (max_depth=0 → nothing).
      const maxDepth = call.query.get("max_depth");
      if (maxDepth) {
        const parent = parentId
          ? seed.comments.find((comment) => comment.id === Number(parentId))
          : undefined;
        const baseDepth = parent ? depthOf(parent.path) : 1;
        comments = comments.filter(
          (comment) => depthOf(comment.path) - baseDepth <= Number(maxDepth),
        );
      }

      const { items, nextPage } = pageOf(comments, call);
      return {
        json: build.commentListResponse(
          items.map(commentView),
          nextPage ?? null,
        ),
      };
    });

    this.mock("GET /api/alpha/community", (call) => {
      const id = call.query.get("id");
      const name = call.query.get("name")?.split("@")[0];
      const found = seed.communities.find((candidate) =>
        id !== null ? candidate.id === Number(id) : candidate.name === name,
      );
      return found
        ? { json: build.communityResponse({ community: community(found) }) }
        : communityNotFound;
    });

    // Modlog has no semantic seed model yet, but it is a real public route:
    // default to its exact empty grouped envelope rather than a misleading
    // 501. Tests can install schema-typed rows with `on.getModlog()` and
    // `build.modlogResponse()`.
    this.mock("GET /api/alpha/modlog", {
      json: build.modlogResponse(),
    });

    this.mock("GET /api/alpha/comment/report/list", () =>
      seed.loggedInPerson
        ? { json: { comment_reports: [], next_page: null } }
        : unauthenticated,
    );

    this.mock("GET /api/alpha/post/report/list", () =>
      seed.loggedInPerson
        ? { json: { next_page: null, post_reports: [] } }
        : unauthenticated,
    );

    this.mock("PUT /api/alpha/comment/report/resolve", () =>
      seed.loggedInPerson ? notFound : unauthenticated,
    );

    this.mock("PUT /api/alpha/post/report/resolve", () =>
      seed.loggedInPerson ? notFound : unauthenticated,
    );

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

    const repliesPage = (kind: "mention" | "reply", call: RecordedCall) => {
      const { items, nextPage } = pageOf(
        repliesOf(kind, unreadOnly(call)),
        call,
      );
      return build.repliesResponse(items, nextPage ?? null);
    };

    this.mock("GET /api/alpha/user/replies", (call) =>
      seed.loggedInPerson
        ? { json: repliesPage("reply", call) }
        : unauthenticated,
    );

    this.mock("GET /api/alpha/user/mentions", (call) =>
      seed.loggedInPerson
        ? { json: repliesPage("mention", call) }
        : unauthenticated,
    );

    this.mock("GET /api/alpha/user/notifications", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;

      const requestedStatus = call.query.get("status");
      const status =
        requestedStatus === "New" ||
        requestedStatus === "Read" ||
        requestedStatus === "Unread"
          ? requestedStatus
          : "All";
      const genericNotifications = seed.notifications.flatMap((notification) =>
        notification.kind === "private_message"
          ? []
          : [genericNotificationView(notification)],
      );
      // Match PieFed: it paginates the Notification table before applying the
      // requested read-status filter, so an empty wire page may still have a
      // live cursor.
      const { items, nextPage } = pageOf(genericNotifications, call);
      const filteredItems = items.filter((item) => {
        if (status === "All") return true;
        if (status === "Read") return item.status === "Read";
        return item.status === "Unread";
      });

      return {
        json: build.userNotificationsResponse(filteredItems, {
          nextPage: nextPage ?? null,
          status,
          username: seed.loggedInPerson.name,
        }),
      };
    });

    this.mock("GET /api/alpha/private_message/list", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;

      const messages = seed.notifications.flatMap((notification) =>
        notification.kind === "private_message" &&
        (!unreadOnly(call) || !notification.read)
          ? [privateMessageView(notification)]
          : [],
      );

      return {
        json: build.privateMessageListResponse(pageOf(messages, call).items),
      };
    });

    this.mock("POST /api/alpha/private_message/report", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;

      const { private_message_id } = call.body as {
        private_message_id: number;
      };
      const message = seed.notifications.find(
        (notification) =>
          notification.kind === "private_message" &&
          notification.message.id === private_message_id,
      );
      return message ? { json: {} } : notFound;
    });

    this.mock("GET /api/alpha/community/list", (call) => {
      const { items, nextPage } = pageOf(seed.communities, call);
      return {
        json: {
          communities: items.map((subject) =>
            build.communityView({ community: community(subject) }),
          ),
          next_page: nextPage ?? null,
        },
      };
    });

    // Real PieFed serves this; the lemmyv1 adapter throws UnsupportedError
    // before requesting, so only the piefed fake needs it
    this.mock("GET /api/alpha/federated_instances", () => ({
      json: { federated_instances: { allowed: [], blocked: [], linked: [] } },
    }));

    // Fire-and-forget on the app side, but a real server answers it — an
    // unmocked 501 here made the shared mark-read spec vacuous on piefed
    this.mock("POST /api/alpha/post/mark_as_read", (call) => {
      // PieFed accepts either a single post_id or a post_ids array
      const { post_id, post_ids, read } = call.body as {
        post_id?: number;
        post_ids?: number[];
        read: boolean;
      };
      const ids = post_ids ?? (post_id === undefined ? [] : [post_id]);
      for (const post of seed.posts)
        if (ids.includes(post.id)) post.read = read;
      return { json: { success: true } };
    });

    this.mock("GET /api/alpha/search", (call) => {
      // PieFed capitalizes search types on the wire
      const wireType = call.query.get("type_");
      const type = wireType?.toLowerCase() as SeedSearchType | undefined;
      const results = searchSeed(seed, {
        term: call.query.get("q") ?? undefined,
        type,
      });

      const { items } = pageOf(
        [
          ...results.communities.map(
            (community) => ["community", community] as const,
          ),
          ...results.posts.map((post) => ["post", post] as const),
          ...results.people.map((person) => ["person", person] as const),
          ...results.comments.map((comment) => ["comment", comment] as const),
        ],
        call,
      );

      return {
        json: build.searchResponse({
          comments: items.flatMap(([kind, item]) =>
            kind === "comment" ? [commentView(item)] : [],
          ),
          communities: items.flatMap(([kind, item]) =>
            kind === "community"
              ? [build.communityView({ community: community(item) })]
              : [],
          ),
          posts: items.flatMap(([kind, item]) =>
            kind === "post" ? [postView(item)] : [],
          ),
          type_: (wireType ?? "Posts") as PiefedSearchType,
          users: items.flatMap(([kind, item]) =>
            kind === "person" ? [build.personView(person(item))] : [],
          ),
        }),
      };
    });

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

    this.mock("PUT /api/alpha/user/save_user_settings", (call) => {
      const subject = seed.loggedInPerson;
      if (!subject) return unauthenticated;

      const { show_nsfw } = call.body as { show_nsfw: boolean };
      showNsfwByPerson.set(subject.id, show_nsfw);
      return { json: { my_user: myUserInfo() } };
    });

    // Create/edit/delete writes mutate the seed store; the returned view and
    // subsequent reads reflect the change. PieFed carries content as `body`
    // and duplicates `name` as `title`.
    this.mock("POST /api/alpha/post", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const wire = call.body as {
        body?: string;
        community_id: number;
        name: string;
        url?: string;
      };
      const community = seed.communities.find(
        (candidate) => candidate.id === wire.community_id,
      );
      const post = seed.post({
        body: wire.body,
        community,
        creator: seed.loggedInPerson,
        name: wire.name,
        url: wire.url,
      });
      return { json: { post_view: postView(post) } };
    });

    this.mock("PUT /api/alpha/post", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const wire = call.body as {
        body?: string;
        name?: string;
        post_id: number;
        url?: string;
      };
      const post = findPost(wire.post_id);
      if (!post) return notFound;
      if (wire.name !== undefined) post.name = wire.name;
      if (wire.body !== undefined) post.body = wire.body;
      if (wire.url !== undefined) post.url = wire.url;
      return { json: { post_view: postView(post) } };
    });

    this.mock("POST /api/alpha/post/delete", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { deleted, post_id } = call.body as {
        deleted: boolean;
        post_id: number;
      };
      const post = findPost(post_id);
      if (!post) return notFound;
      post.deleted = deleted;
      return { json: { post_view: postView(post) } };
    });

    this.mock("POST /api/alpha/comment", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const wire = call.body as {
        body: string;
        parent_id?: number;
        post_id: number;
      };
      const post = findPost(wire.post_id);
      if (!post) return notFound;
      const parent = wire.parent_id ? findComment(wire.parent_id) : undefined;
      const comment = seed.comment({
        content: wire.body,
        creator: seed.loggedInPerson,
        post,
      });
      if (parent) comment.path = `${parent.path}.${comment.id}`;
      return { json: { comment_view: commentView(comment) } };
    });

    this.mock("PUT /api/alpha/comment", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { body, comment_id } = call.body as {
        body: string;
        comment_id: number;
      };
      const comment = findComment(comment_id);
      if (!comment) return notFound;
      comment.content = body;
      return { json: { comment_view: commentView(comment) } };
    });

    this.mock("POST /api/alpha/comment/delete", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { comment_id, deleted } = call.body as {
        comment_id: number;
        deleted: boolean;
      };
      const comment = findComment(comment_id);
      if (!comment) return notFound;
      comment.deleted = deleted;
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

    this.mock("PUT /api/alpha/user/notification_state", (call) => {
      if (!seed.loggedInPerson) return unauthenticated;
      const { notif_id, read_state } = call.body as {
        notif_id: number;
        read_state: boolean;
      };
      const notification = seed.notifications.find(
        (candidate) =>
          candidate.kind !== "private_message" && candidate.id === notif_id,
      );
      if (!notification || notification.kind === "private_message")
        return notFound;

      notification.read = read_state;
      return { json: genericNotificationView(notification) };
    });

    this.mock("POST /api/alpha/user/mark_all_as_read", () => {
      if (!seed.loggedInPerson) return unauthenticated;
      for (const notification of seed.notifications) notification.read = true;
      return { json: { success: true } };
    });

    this.mock("GET /api/alpha/user", (call) => {
      const savedOnly = call.query.get("saved_only") === "true";
      if (savedOnly && !seed.loggedInPerson) return unauthenticated;

      const personId = call.query.get("person_id");
      const username = call.query.get("username")?.split("@")[0];
      const found = seed.people.find((candidate) =>
        personId !== null
          ? candidate.id === Number(personId)
          : candidate.name === username,
      );
      if (!found) return notFound;

      if (!savedOnly) return { json: build.userResponse(person(found)) };

      // PieFed pages saved posts and comments independently, so one wire
      // response may contain up to twice the requested limit. Saved content
      // belongs to the authenticated user; person_view still describes the
      // profile requested by person_id/username.
      const posts = pageOf(
        seed.posts.filter((candidate) => candidate.saved),
        call,
      ).items.map(postView);
      const comments = pageOf(
        seed.comments.filter((candidate) => candidate.saved),
        call,
      ).items.map(commentView);

      return {
        json: build.userResponse(person(found), { comments, posts }),
      };
    });
  }
}

export * from "./builders";
