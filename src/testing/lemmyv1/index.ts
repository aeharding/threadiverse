import { FakeInstance } from "../FakeInstance";
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

export interface FakeLemmyV1InstanceOptions {
  /** Bare hostname (no scheme) the fake instance answers for */
  host?: string;
  /** Lemmy version reported via nodeinfo and `GET /api/v4/site` */
  version?: string;
}

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

  /** Semantic content store the default routes are derived from */
  readonly seed = new SeedStore();

  constructor({
    host = "v1.test.lemmy",
    version = DEFAULT_VERSION,
  }: FakeLemmyV1InstanceOptions = {}) {
    super({ host, software: { name: "lemmy", version } });

    const build = createLemmyV1Builders({ host, version });
    this.build = build;
    const seed = this.seed;

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
      const comments = postId
        ? seed.comments.filter((comment) => comment.post.id === Number(postId))
        : seed.comments;
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

    this.mock("GET /api/v4/account", () =>
      seed.loggedInPerson
        ? { json: build.myUserInfo({ person: person(seed.loggedInPerson) }) }
        : { json: { error: "not_logged_in" }, status: 401 },
    );

    this.mock("GET /api/v4/account/unread_counts", () => ({
      json: { notification_count: seed.unreadNotificationCount },
    }));

    this.mock("GET /api/v4/account/notification/list", (call) => {
      const type = call.query.get("type_");
      const notifications =
        type && type !== "all"
          ? seed.notifications.filter((notification) =>
              type === "private_message"
                ? notification.kind === "private_message"
                : notification.kind === type,
            )
          : seed.notifications;
      return {
        json: build.pagedResponse(notifications.map(notificationView)),
      };
    });

    // Fire-and-forget side effect of many logged-in interactions
    this.mock("POST /api/v4/post/mark_as_read/many", {
      json: { success: true },
    });
  }
}

export * from "./builders";
