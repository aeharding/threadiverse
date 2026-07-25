// Typed wire-format builders for a fake PieFed instance.
//
// Every builder's return type is checked against the same OpenAPI-generated
// types (src/providers/piefed/schema.ts) the piefed compat layer consumes,
// so fixtures cannot silently drift from the wire format: regenerating the
// schema from live swagger turns drift into compile errors here instead of
// mysteriously failing consumer e2e suites.

import type { components } from "../../providers/piefed/schema";
import type { Wire } from "../wire";

import { DEFAULT_NOW } from "../lemmyv1/builders";

export interface PiefedBuildersOptions {
  /** Bare hostname used in generated actor ids, e.g. `"piefed.test"` */
  host: string;
  /** Timestamp used for all published dates */
  now?: string;
  /** Reported by `GET /api/alpha/site` and nodeinfo */
  version?: string;
}

type Schemas = components["schemas"];

export const DEFAULT_PIEFED_VERSION = "1.2.0";

const DEFAULT_COMMUNITY_ID = 111;

export type PiefedBuilders = ReturnType<typeof createPiefedBuilders>;

export function createPiefedBuilders({
  host,
  now = DEFAULT_NOW,
  version = DEFAULT_PIEFED_VERSION,
}: PiefedBuildersOptions) {
  function person(over: {
    id: number;
    title?: string;
    user_name: string;
  }): Wire<Schemas["Person"]> {
    return {
      actor_id: `https://${host}/u/${over.user_name}`,
      banned: false,
      bot: false,
      deleted: false,
      id: over.id,
      instance_id: 1,
      local: true,
      published: now,
      title: over.title,
      user_name: over.user_name,
    };
  }

  function community(
    over: { id?: number; name?: string; title?: string } = {},
  ): Wire<Schemas["Community"]> {
    const name = over.name ?? "test_comm";

    return {
      actor_id: `https://${host}/c/${name}`,
      ai_generated: false,
      deleted: false,
      hidden: false,
      id: over.id ?? DEFAULT_COMMUNITY_ID,
      instance_id: 1,
      local: true,
      name,
      nsfw: false,
      published: now,
      removed: false,
      restricted_to_mods: false,
      title: over.title ?? "Test Community",
    };
  }

  function communityView(
    over: { community?: Wire<Schemas["Community"]> } = {},
  ): Wire<Schemas["CommunityView"]> {
    const resolvedCommunity = over.community ?? community();

    return {
      activity_alert: false,
      blocked: false,
      community: resolvedCommunity,
      counts: {
        id: resolvedCommunity.id,
        post_count: 1,
        post_reply_count: 0,
        published: now,
        subscriptions_count: 1,
        total_subscriptions_count: 1,
      },
      subscribed: "NotSubscribed",
    };
  }

  function post(over: {
    body?: string;
    community?: Wire<Schemas["Community"]>;
    creator: Wire<Schemas["Person"]>;
    deleted?: boolean;
    id: number;
    title: string;
    url?: string;
  }): Wire<Schemas["Post"]> {
    return {
      ai_generated: false,
      ap_id: `https://${host}/post/${over.id}`,
      body: over.body,
      community_id: over.community?.id ?? DEFAULT_COMMUNITY_ID,
      deleted: over.deleted ?? false,
      id: over.id,
      instance_sticky: false,
      language_id: 0,
      local: true,
      locked: false,
      nsfw: false,
      post_type: over.url ? "Link" : "Discussion",
      published: now,
      removed: false,
      sticky: false,
      title: over.title,
      url: over.url,
      user_id: over.creator.id,
    };
  }

  // Vote counts from a base score (all base votes are upvotes) plus the
  // logged-in user's vote layered on top.
  function votes(baseScore: number, myVote: -1 | 0 | 1) {
    const upvotes = baseScore + (myVote === 1 ? 1 : 0);
    const downvotes = myVote === -1 ? 1 : 0;
    return { downvotes, score: upvotes - downvotes, upvotes };
  }

  function postView(over: {
    body?: string;
    community?: Wire<Schemas["Community"]>;
    creator: Wire<Schemas["Person"]>;
    deleted?: boolean;
    id: number;
    myVote?: -1 | 0 | 1;
    read?: boolean;
    saved?: boolean;
    score?: number;
    title: string;
    url?: string;
  }): Wire<Schemas["PostView"]> {
    const resolvedCommunity = over.community ?? community();
    const myVote = over.myVote ?? 0;

    return {
      banned_from_community: false,
      community: resolvedCommunity,
      counts: {
        comments: 0,
        cross_posts: 0,
        newest_comment_time: now,
        post_id: over.id,
        published: now,
        ...votes(over.score ?? 1, myVote),
      },
      creator: over.creator,
      creator_banned_from_community: false,
      creator_is_admin: false,
      creator_is_moderator: false,
      hidden: false,
      my_vote: myVote,
      post: post({ ...over, community: resolvedCommunity }),
      read: over.read ?? false,
      saved: over.saved ?? false,
      subscribed: "NotSubscribed",
      unread_comments: 0,
    };
  }

  function commentView(over: {
    body: string;
    child_count?: number;
    creator?: Wire<Schemas["Person"]>;
    deleted?: boolean;
    id: number;
    myVote?: -1 | 0 | 1;
    path?: string;
    post: Pick<Wire<Schemas["PostView"]>, "community" | "creator" | "post">;
    published?: string;
    saved?: boolean;
    score?: number;
  }): Wire<Schemas["CommentView"]> {
    const creator = over.creator ?? over.post.creator;
    const published = over.published ?? now;
    const myVote = over.myVote ?? 0;

    return {
      activity_alert: false,
      banned_from_community: false,
      comment: {
        ap_id: `https://${host}/comment/${over.id}`,
        body: over.body,
        deleted: over.deleted ?? false,
        distinguished: false,
        id: over.id,
        language_id: 0,
        local: true,
        path: over.path ?? `0.${over.id}`,
        post_id: over.post.post.id,
        published,
        removed: false,
        user_id: creator.id,
      },
      community: over.post.community,
      counts: {
        child_count: over.child_count ?? 0,
        comment_id: over.id,
        published,
        ...votes(over.score ?? 1, myVote),
      },
      creator,
      creator_banned_from_community: false,
      creator_blocked: false,
      creator_is_admin: false,
      creator_is_moderator: false,
      my_vote: myVote,
      post: over.post.post,
      saved: over.saved ?? false,
      subscribed: "NotSubscribed",
    };
  }

  function personView(
    subject: Wire<Schemas["Person"]>,
  ): Wire<Schemas["PersonView"]> {
    return {
      activity_alert: false,
      counts: {
        comment_count: 0,
        person_id: subject.id,
        post_count: 0,
      },
      is_admin: false,
      person: subject,
    };
  }

  /** `GET /api/alpha/search` (search) */
  function searchResponse(
    over: {
      comments?: Wire<Schemas["CommentView"]>[];
      communities?: Wire<Schemas["CommunityView"]>[];
      posts?: Wire<Schemas["PostView"]>[];
      type_?: Schemas["SearchResponse"]["type_"];
      users?: Wire<Schemas["PersonView"]>[];
    } = {},
  ): Wire<Schemas["SearchResponse"]> {
    return {
      comments: over.comments ?? [],
      communities: over.communities ?? [],
      posts: over.posts ?? [],
      type_: over.type_ ?? "Posts",
      users: over.users ?? [],
    };
  }

  /** `GET /api/alpha/user` (getPersonDetails) */
  function userResponse(
    subject: Wire<Schemas["Person"]>,
  ): Wire<Schemas["GetUserResponse"]> {
    return {
      comments: [],
      moderates: [],
      person_view: personView(subject),
      posts: [],
    };
  }

  /** `GET /api/alpha/community` (getCommunity) */
  function communityResponse(
    over: { community?: Wire<Schemas["Community"]> } = {},
  ): Wire<Schemas["GetCommunityResponse"]> {
    return {
      community_view: communityView(over),
      discussion_languages: [],
      moderators: [],
    };
  }

  function localUser(): Wire<Schemas["LocalUser"]> {
    return {
      accept_private_messages: "All",
      ai_visibility: "Show",
      bot_visibility: "Show",
      default_comment_sort_type: "Hot",
      default_listing_type: "All",
      email_unread: false,
      federate_votes: true,
      feed_auto_follow: false,
      feed_auto_leave: false,
      hide_low_quality: false,
      indexable: true,
      newsletter: false,
      nsfl_visibility: "Hide",
      nsfw_visibility: "Blur",
      reply_collapse_threshold: 0,
      reply_hide_threshold: 0,
      searchable: true,
      show_bot_accounts: true,
      show_nsfl: false,
      show_nsfw: false,
      show_read_posts: true,
      show_scores: true,
    };
  }

  /** The authenticated user's info, embedded in `GET /api/alpha/site` */
  function myUserInfo(
    subject: Wire<Schemas["Person"]>,
  ): Wire<Schemas["MyUserInfo"]> {
    return {
      community_blocks: [],
      discussion_languages: [],
      follows: [],
      instance_blocks: [],
      local_user_view: {
        counts: { comment_count: 0, person_id: subject.id, post_count: 0 },
        local_user: localUser(),
        person: subject,
      },
      moderates: [],
      person_blocks: [],
    };
  }

  /** `GET /api/alpha/site` (getSite) */
  function getSiteResponse(
    over: { myUser?: Wire<Schemas["Person"]>; name?: string } = {},
  ): Wire<Schemas["GetSiteResponse"]> {
    return {
      admins: [],
      my_user: over.myUser ? myUserInfo(over.myUser) : undefined,
      site: {
        actor_id: `https://${host}/`,
        name: over.name ?? "Test piefed site",
      },
      version,
    };
  }

  /**
   * `GET /api/alpha/user/replies` / `/user/mentions` item. PieFed reuses
   * CommentReplyView for both; the notification identity is
   * `comment_reply.id`.
   */
  function commentReplyView(over: {
    comment: Wire<Schemas["CommentView"]>;
    id: number;
    read?: boolean;
    recipient: Wire<Schemas["Person"]>;
  }): Wire<Schemas["CommentReplyView"]> {
    return {
      activity_alert: false,
      comment: over.comment.comment,
      comment_reply: {
        comment_id: over.comment.comment.id,
        id: over.id,
        published: over.comment.comment.published,
        read: over.read ?? false,
        recipient_id: over.recipient.id,
      },
      community: over.comment.community,
      counts: over.comment.counts,
      creator: over.comment.creator,
      creator_banned_from_community: false,
      creator_blocked: false,
      creator_is_admin: false,
      creator_is_moderator: false,
      my_vote: 0,
      post: over.comment.post,
      recipient: over.recipient,
      saved: false,
      subscribed: "NotSubscribed",
    };
  }

  function privateMessageView(over: {
    content: string;
    creator: Wire<Schemas["Person"]>;
    id: number;
    read?: boolean;
    recipient: Wire<Schemas["Person"]>;
  }): Wire<Schemas["PrivateMessageView"]> {
    return {
      creator: over.creator,
      private_message: {
        ap_id: `https://${host}/private_message/${over.id}`,
        content: over.content,
        creator_id: over.creator.id,
        deleted: false,
        id: over.id,
        local: true,
        published: now,
        read: over.read ?? false,
        recipient_id: over.recipient.id,
      },
      recipient: over.recipient,
    };
  }

  /** `GET /api/alpha/user/replies` + `/user/mentions` response envelope */
  function repliesResponse(
    replies: Wire<Schemas["CommentReplyView"]>[],
    nextPage: null | string = null,
  ): Wire<Schemas["UserRepliesResponse"]> {
    return { next_page: nextPage, replies };
  }

  /** `GET /api/alpha/private_message/list` response envelope */
  function privateMessageListResponse(
    private_messages: Wire<Schemas["PrivateMessageView"]>[],
  ): Wire<Schemas["ListPrivateMessagesResponse"]> {
    return { private_messages };
  }

  /** `GET /api/alpha/post/list` (getPosts) response envelope */
  function postListResponse(
    posts: Wire<Schemas["PostView"]>[],
    nextPage: null | string = null,
  ): Wire<Schemas["ListPostsResponse"]> {
    return { next_page: nextPage, posts };
  }

  /** `GET /api/alpha/comment/list` (getComments) response envelope */
  function commentListResponse(
    comments: Wire<Schemas["CommentView"]>[],
    nextPage: null | string = null,
  ): Wire<Schemas["ListCommentsResponse"]> {
    return { comments, next_page: nextPage };
  }

  return {
    commentListResponse,
    commentReplyView,
    commentView,
    community,
    communityResponse,
    communityView,
    getSiteResponse,
    localUser,
    myUserInfo,
    person,
    personView,
    post,
    postListResponse,
    postView,
    privateMessageListResponse,
    privateMessageView,
    repliesResponse,
    searchResponse,
    userResponse,
  };
}
