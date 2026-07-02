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
    id: number;
    title: string;
    url?: string;
  }): Wire<Schemas["Post"]> {
    return {
      ai_generated: false,
      ap_id: `https://${host}/post/${over.id}`,
      body: over.body,
      community_id: over.community?.id ?? DEFAULT_COMMUNITY_ID,
      deleted: false,
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

  function postView(over: {
    body?: string;
    community?: Wire<Schemas["Community"]>;
    creator: Wire<Schemas["Person"]>;
    id: number;
    title: string;
    url?: string;
  }): Wire<Schemas["PostView"]> {
    const resolvedCommunity = over.community ?? community();

    return {
      banned_from_community: false,
      community: resolvedCommunity,
      counts: {
        comments: 0,
        cross_posts: 0,
        downvotes: 0,
        newest_comment_time: now,
        post_id: over.id,
        published: now,
        score: 1,
        upvotes: 1,
      },
      creator: over.creator,
      creator_banned_from_community: false,
      creator_is_admin: false,
      creator_is_moderator: false,
      hidden: false,
      post: post({ ...over, community: resolvedCommunity }),
      read: false,
      saved: false,
      subscribed: "NotSubscribed",
      unread_comments: 0,
    };
  }

  function commentView(over: {
    body: string;
    child_count?: number;
    creator?: Wire<Schemas["Person"]>;
    id: number;
    path?: string;
    post: Pick<Wire<Schemas["PostView"]>, "community" | "creator" | "post">;
    published?: string;
  }): Wire<Schemas["CommentView"]> {
    const creator = over.creator ?? over.post.creator;
    const published = over.published ?? now;

    return {
      activity_alert: false,
      banned_from_community: false,
      comment: {
        ap_id: `https://${host}/comment/${over.id}`,
        body: over.body,
        deleted: false,
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
        downvotes: 0,
        published,
        score: 1,
        upvotes: 1,
      },
      creator,
      creator_banned_from_community: false,
      creator_blocked: false,
      creator_is_admin: false,
      creator_is_moderator: false,
      post: over.post.post,
      saved: false,
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

  /** `GET /api/alpha/site` (getSite) */
  function getSiteResponse(
    over: { name?: string } = {},
  ): Wire<Schemas["GetSiteResponse"]> {
    return {
      admins: [],
      site: {
        actor_id: `https://${host}/`,
        name: over.name ?? "Test piefed site",
      },
      version,
    };
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
    commentView,
    community,
    communityResponse,
    communityView,
    getSiteResponse,
    person,
    personView,
    post,
    postListResponse,
    postView,
    userResponse,
  };
}
