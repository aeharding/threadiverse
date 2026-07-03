/**
 * Semantic, provider-agnostic seed model for fake instances.
 *
 * Consumer tests describe *what exists* — people, posts, comments,
 * notifications — and each fake instance derives its provider's wire
 * responses from this store. Specs never touch endpoint paths or wire
 * shapes for content; `mock()`/`calls()` remain for error injection and
 * asserting outgoing requests.
 *
 * Field names follow threadiverse's canonical types (`post.name`,
 * `comment.content`) so tests assert on the same names they seed.
 */

export interface SeedComment {
  childCount: number;
  content: string;
  creator: SeedPerson;
  id: number;
  path: string;
  post: SeedPost;
  /** ISO 8601; defaults to the fake's fixed "now" */
  published?: string;
}

export interface SeedCommunity {
  id: number;
  name: string;
  title: string;
}

export type SeedNotification =
  | {
      comment: SeedComment;
      id: number;
      kind: "mention" | "reply";
      read: boolean;
    }
  | {
      id: number;
      kind: "private_message";
      message: SeedPrivateMessage;
      read: boolean;
    };

export interface SeedPerson {
  displayName?: string;
  id: number;
  name: string;
}

export interface SeedPost {
  body?: string;
  community: SeedCommunity;
  creator: SeedPerson;
  id: number;
  name: string;
  url?: string;
}

export interface SeedPrivateMessage {
  content: string;
  creator: SeedPerson;
  id: number;
  recipient: SeedPerson;
}

export class SeedStore {
  comments: SeedComment[] = [];
  communities: SeedCommunity[] = [];
  loggedInPerson: SeedPerson | undefined;
  notifications: SeedNotification[] = [];
  people: SeedPerson[] = [];
  posts: SeedPost[] = [];
  siteName = "Test site";

  get unreadNotificationCount(): number {
    return this.notifications.filter((notification) => !notification.read)
      .length;
  }

  // High start so explicit ids in tests never collide with generated ones
  #nextId = 1000;

  comment(over: {
    childCount?: number;
    content: string;
    creator?: SeedPerson;
    id?: number;
    path?: string;
    post?: SeedPost;
    published?: string;
  }): SeedComment {
    const post = over.post ?? this.posts[0] ?? this.post({ name: "Seed post" });
    const id = over.id ?? this.#nextId++;

    const comment: SeedComment = {
      childCount: over.childCount ?? 0,
      content: over.content,
      creator: over.creator ?? post.creator,
      id,
      path: over.path ?? `0.${id}`,
      post,
      published: over.published,
    };
    this.comments.push(comment);
    return comment;
  }

  /** Comments on the given post (in seed order) */
  commentsFor(post: SeedPost): SeedComment[] {
    return this.comments.filter((comment) => comment.post === post);
  }

  community(
    over: { id?: number; name?: string; title?: string } = {},
  ): SeedCommunity {
    const community: SeedCommunity = {
      id: over.id ?? this.#nextId++,
      name: over.name ?? "test_comm",
      title: over.title ?? "Test Community",
    };
    this.communities.push(community);
    return community;
  }

  /**
   * Mark a person as the authenticated user. Fakes derive the account
   * endpoints (my user, unread counts) from this.
   */
  loggedInAs(person: SeedPerson): void {
    this.loggedInPerson = person;
  }

  mention(over: {
    comment: SeedComment;
    id?: number;
    read?: boolean;
  }): SeedNotification {
    return this.#notify({ ...over, kind: "mention" });
  }

  person(over: {
    displayName?: string;
    id?: number;
    name: string;
  }): SeedPerson {
    const person: SeedPerson = {
      displayName: over.displayName,
      id: over.id ?? this.#nextId++,
      name: over.name,
    };
    this.people.push(person);
    return person;
  }

  post(over: {
    body?: string;
    community?: SeedCommunity;
    creator?: SeedPerson;
    id?: number;
    name: string;
    url?: string;
  }): SeedPost {
    const post: SeedPost = {
      body: over.body,
      community: over.community ?? this.#defaultCommunity(),
      creator: over.creator ?? this.#defaultPerson(),
      id: over.id ?? this.#nextId++,
      name: over.name,
      url: over.url,
    };
    this.posts.push(post);
    return post;
  }

  /**
   * A private message to `recipient` (defaults to the logged-in user),
   * including its inbox notification.
   */
  privateMessage(over: {
    content: string;
    creator: SeedPerson;
    id?: number;
    read?: boolean;
    recipient?: SeedPerson;
  }): SeedPrivateMessage {
    const recipient = over.recipient ?? this.loggedInPerson;

    if (!recipient)
      throw new Error(
        "privateMessage: pass a recipient or seed.loggedInAs(person) first",
      );

    const message: SeedPrivateMessage = {
      content: over.content,
      creator: over.creator,
      id: over.id ?? this.#nextId++,
      recipient,
    };

    this.notifications.push({
      id: this.#nextId++,
      kind: "private_message",
      message,
      read: over.read ?? false,
    });

    return message;
  }

  reply(over: {
    comment: SeedComment;
    id?: number;
    read?: boolean;
  }): SeedNotification {
    return this.#notify({ ...over, kind: "reply" });
  }

  site(over: { name: string }): void {
    this.siteName = over.name;
  }

  #defaultCommunity(): SeedCommunity {
    return this.communities[0] ?? this.community();
  }

  #defaultPerson(): SeedPerson {
    return (
      this.loggedInPerson ??
      this.people[0] ??
      this.person({ name: "seed_user" })
    );
  }

  #notify(over: {
    comment: SeedComment;
    id?: number;
    kind: "mention" | "reply";
    read?: boolean;
  }): SeedNotification {
    const notification: SeedNotification = {
      comment: over.comment,
      id: over.id ?? this.#nextId++,
      kind: over.kind,
      read: over.read ?? false,
    };
    this.notifications.push(notification);
    return notification;
  }
}
