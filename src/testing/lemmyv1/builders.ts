// Typed wire-format builders for a fake Lemmy v1 instance.
//
// Every builder's return type is checked against the same lemmy-js-client-v1
// types the v1 compat layer consumes, so fixtures cannot silently drift from
// the wire format: bumping lemmy-js-client turns drift into compile errors
// here instead of mysteriously failing consumer e2e suites.

import type * as LemmyV1 from "lemmy-js-client-v1";

import type { Wire } from "../wire";

export interface LemmyV1BuildersOptions {
  /** Bare hostname used in generated ap_ids, e.g. `"v1.test.lemmy"` */
  host: string;
  /** Timestamp used for all published/refreshed dates */
  now?: string;
  /** Reported by `GET /api/v4/site` and nodeinfo */
  version?: string;
}

export const DEFAULT_NOW = "2026-05-21T12:00:00.000Z";
export const DEFAULT_VERSION = "1.0.0-beta.1";

const DEFAULT_COMMUNITY_ID = 111;

export type LemmyV1Builders = ReturnType<typeof createLemmyV1Builders>;

export function createLemmyV1Builders({
  host,
  now = DEFAULT_NOW,
  version = DEFAULT_VERSION,
}: LemmyV1BuildersOptions) {
  function person(over: {
    display_name?: string;
    id: number;
    name: string;
  }): Wire<LemmyV1.Person> {
    return {
      ap_id: `https://${host}/u/${over.name}`,
      bot_account: false,
      comment_count: 0,
      deleted: false,
      display_name: over.display_name,
      id: over.id,
      instance_id: 1,
      last_refreshed_at: now,
      local: true,
      name: over.name,
      post_count: 0,
      published_at: now,
    };
  }

  function community(
    over: { id?: number; name?: string; title?: string } = {},
  ): Wire<LemmyV1.Community> {
    const name = over.name ?? "test_comm";

    return {
      ap_id: `https://${host}/c/${name}`,
      comments: 0,
      deleted: false,
      id: over.id ?? DEFAULT_COMMUNITY_ID,
      instance_id: 1,
      last_refreshed_at: now,
      local: true,
      local_removed: false,
      name,
      nsfw: false,
      posting_restricted_to_mods: false,
      posts: 1,
      published_at: now,
      removed: false,
      report_count: 0,
      subscribers: 1,
      subscribers_local: 1,
      title: over.title ?? "Test Community",
      unresolved_report_count: 0,
      users_active_day: 0,
      users_active_half_year: 0,
      users_active_month: 0,
      users_active_week: 0,
      visibility: "public",
    };
  }

  function post(over: {
    body?: string;
    community?: Wire<LemmyV1.Community>;
    creator: Wire<LemmyV1.Person>;
    id: number;
    name: string;
    url?: string;
  }): Wire<LemmyV1.Post> {
    return {
      ap_id: `https://${host}/post/${over.id}`,
      body: over.body,
      comments: 0,
      community_id: over.community?.id ?? DEFAULT_COMMUNITY_ID,
      creator_id: over.creator.id,
      deleted: false,
      downvotes: 0,
      featured_community: false,
      featured_local: false,
      federation_pending: false,
      id: over.id,
      language_id: 0,
      local: true,
      locked: false,
      name: over.name,
      newest_comment_time_at: now,
      nsfw: false,
      published_at: now,
      removed: false,
      report_count: 0,
      score: 1,
      unresolved_report_count: 0,
      upvotes: 1,
      url: over.url,
    };
  }

  function postView(over: {
    body?: string;
    community?: Wire<LemmyV1.Community>;
    creator: Wire<LemmyV1.Person>;
    id: number;
    name: string;
    url?: string;
  }): Wire<LemmyV1.PostView> {
    const resolvedCommunity = over.community ?? community();

    return {
      can_mod: false,
      community: resolvedCommunity,
      creator: over.creator,
      creator_banned: false,
      creator_banned_from_community: false,
      creator_is_admin: false,
      creator_is_moderator: false,
      post: post({ ...over, community: resolvedCommunity }),
      tags: [],
    };
  }

  function commentView(over: {
    child_count?: number;
    content: string;
    creator?: Wire<LemmyV1.Person>;
    id: number;
    path?: string;
    post: Pick<Wire<LemmyV1.PostView>, "community" | "creator" | "post">;
    published_at?: string;
  }): Wire<LemmyV1.CommentView> {
    const creator = over.creator ?? over.post.creator;

    return {
      can_mod: false,
      comment: {
        ap_id: `https://${host}/comment/${over.id}`,
        child_count: over.child_count ?? 0,
        content: over.content,
        creator_id: creator.id,
        deleted: false,
        distinguished: false,
        downvotes: 0,
        federation_pending: false,
        id: over.id,
        language_id: 0,
        local: true,
        locked: false,
        path: over.path ?? `0.${over.id}`,
        post_id: over.post.post.id,
        published_at: over.published_at ?? now,
        removed: false,
        report_count: 0,
        score: 1,
        unresolved_report_count: 0,
        upvotes: 1,
      },
      community: over.post.community,
      creator,
      creator_banned: false,
      creator_banned_from_community: false,
      creator_is_admin: false,
      creator_is_moderator: false,
      post: over.post.post,
      tags: [],
    };
  }

  function privateMessageView(over: {
    content: string;
    creator: Wire<LemmyV1.Person>;
    id: number;
    recipient: Wire<LemmyV1.Person>;
  }): Wire<LemmyV1.PrivateMessageView> {
    return {
      creator: over.creator,
      private_message: {
        ap_id: `https://${host}/private_message/${over.id}`,
        content: over.content,
        creator_id: over.creator.id,
        deleted: false,
        deleted_by_recipient: false,
        id: over.id,
        local: true,
        published_at: now,
        recipient_id: over.recipient.id,
        removed: false,
      },
      recipient: over.recipient,
    };
  }

  /**
   * NotificationView for a comment-based notification (reply/mention/
   * subscribed). Inapplicable `*_id` fields are JSON `null` on the real
   * wire (not omitted) — kept here to exercise that normalization.
   */
  function commentNotification(over: {
    comment: Wire<LemmyV1.CommentView>;
    id: number;
    kind: "mention" | "reply" | "subscribed";
    read?: boolean;
    recipient_id: number;
  }): Wire<LemmyV1.NotificationView> {
    return {
      data: { type_: "comment", ...over.comment },
      notification: {
        comment_id: over.comment.comment.id,
        creator_id: over.comment.creator.id,
        id: over.id,
        kind: over.kind,
        modlog_id: null,
        post_id: over.comment.post.id,
        private_message_id: null,
        published_at: over.comment.comment.published_at,
        read: over.read ?? false,
        recipient_id: over.recipient_id,
      },
    };
  }

  function privateMessageNotification(over: {
    id: number;
    message: Wire<LemmyV1.PrivateMessageView>;
    read?: boolean;
  }): Wire<LemmyV1.NotificationView> {
    return {
      data: { type_: "private_message", ...over.message },
      notification: {
        comment_id: null,
        creator_id: over.message.creator.id,
        id: over.id,
        kind: "private_message",
        modlog_id: null,
        post_id: null,
        private_message_id: over.message.private_message.id,
        published_at: over.message.private_message.published_at,
        read: over.read ?? false,
        recipient_id: over.message.recipient.id,
      },
    };
  }

  function modlogView(over: {
    id: number;
    kind: LemmyV1.ModlogKind;
    moderator?: Wire<LemmyV1.Person>;
    reason?: null | string;
    target_comment?: Wire<LemmyV1.Comment>;
    target_community?: Wire<LemmyV1.Community>;
    target_person?: Wire<LemmyV1.Person>;
    target_post?: Wire<LemmyV1.Post>;
  }): Wire<LemmyV1.ModlogView> {
    return {
      moderator: over.moderator,
      modlog: {
        bulk_action_parent_id: null,
        // intentionally null-able to exercise null → undefined handling
        expires_at: null,
        id: over.id,
        is_revert: false,
        kind: over.kind,
        published_at: now,
        reason: over.reason ?? null,
      },
      target_comment: over.target_comment,
      target_community: over.target_community,
      target_person: over.target_person,
      target_post: over.target_post,
    };
  }

  function localUser(over: {
    admin?: boolean;
    person_id: number;
  }): Wire<LemmyV1.LocalUser> {
    return {
      accepted_application: true,
      admin: over.admin ?? false,
      animated_images_enabled: true,
      auto_mark_fetched_posts_as_read: false,
      blur_nsfw: true,
      collapse_bot_comments: false,
      default_comment_sort_type: "hot",
      default_items_per_page: 50,
      default_listing_type: "all",
      default_post_sort_type: "active",
      email_verified: false,
      hide_media: false,
      id: over.person_id,
      infinite_scroll_enabled: false,
      interface_language: "browser",
      last_donation_notification_at: now,
      open_links_in_new_tab: false,
      person_id: over.person_id,
      post_listing_mode: "list",
      private_messages_enabled: true,
      send_notifications_to_email: false,
      show_avatars: true,
      show_bot_accounts: true,
      show_downvotes: "show",
      show_nsfw: false,
      show_person_votes: true,
      show_read_posts: true,
      show_score: true,
      show_upvote_percentage: true,
      show_upvotes: true,
      theme: "browser",
      totp_2fa_enabled: false,
    };
  }

  /** Raw v1 MyUserInfo returned by `GET /api/v4/account` (getMyUser) */
  function myUserInfo(over: {
    admin?: boolean;
    person: Wire<LemmyV1.Person>;
  }): Wire<LemmyV1.MyUserInfo> {
    return {
      community_blocks: [],
      discussion_languages: [],
      follows: [],
      instance_communities_blocks: [],
      instance_persons_blocks: [],
      keyword_blocks: [],
      local_user_view: {
        banned: false,
        local_user: localUser({
          admin: over.admin,
          person_id: over.person.id,
        }),
        person: over.person,
      },
      moderates: [],
      multi_community_follows: [],
      person_blocks: [],
    };
  }

  /** `GET /api/v4/person` (getPersonDetails) */
  function personResponse(
    subject: Wire<LemmyV1.Person>,
  ): Wire<LemmyV1.GetPersonDetailsResponse> {
    return {
      moderates: [],
      multi_communities_created: [],
      person_view: {
        banned: false,
        is_admin: false,
        person: subject,
      },
    };
  }

  /** `GET /api/v4/community` (getCommunity) */
  function communityView(
    over: { community?: Wire<LemmyV1.Community> } = {},
  ): Wire<LemmyV1.CommunityView> {
    return {
      can_mod: false,
      community: over.community ?? community(),
      tags: [],
    };
  }

  function communityResponse(
    over: { community?: Wire<LemmyV1.Community> } = {},
  ): Wire<LemmyV1.GetCommunityResponse> {
    return {
      community_view: communityView(over),
      discussion_languages: [],
      moderators: [],
    };
  }

  /** `GET /api/v4/post` (getPost) */
  function postResponse(
    view: Wire<LemmyV1.PostView>,
  ): Wire<LemmyV1.GetPostResponse> {
    return {
      community_view: communityView({ community: view.community }),
      cross_posts: [],
      post_view: view,
    };
  }

  /** `GET /api/v4/site` (getSite) */
  function getSiteResponse(
    over: { name?: string; posts?: number } = {},
  ): Wire<LemmyV1.GetSiteResponse> {
    return {
      active_plugins: [],
      admin_oauth_providers: [],
      admins: [],
      all_languages: [],
      blocked_urls: [],
      captcha_enabled: false,
      discussion_languages: [],
      oauth_providers: [],
      site_view: {
        instance: {
          domain: host,
          id: 1,
          published_at: now,
          software: "lemmy",
          version,
        },
        local_site: {
          application_email_admins: false,
          comment_downvotes: "all",
          comment_upvotes: "all",
          comments: 0,
          communities: 1,
          community_creation_admin_only: false,
          default_comment_sort_type: "hot",
          default_items_per_page: 50,
          default_post_listing_mode: "list",
          default_post_listing_type: "all",
          default_post_sort_type: "active",
          default_theme: "browser",
          email_notifications_disabled: false,
          email_verification_required: false,
          federation_enabled: true,
          federation_signed_fetch: false,
          id: 1,
          image_allow_video_uploads: true,
          image_max_avatar_size: 512,
          image_max_banner_size: 1024,
          image_max_thumbnail_size: 256,
          image_max_upload_size: 50_000_000,
          image_mode: "store_link_previews",
          image_upload_disabled: false,
          image_upload_timeout_seconds: 30,
          nsfw_content_disallowed: false,
          oauth_registration: false,
          post_downvotes: "all",
          post_upvotes: "all",
          posts: over.posts ?? 0,
          private_instance: false,
          published_at: now,
          registration_mode: "open",
          reports_email_admins: false,
          site_id: 1,
          site_setup: true,
          users: 1,
          users_active_day: 1,
          users_active_half_year: 1,
          users_active_month: 1,
          users_active_week: 1,
        },
        local_site_rate_limit: {
          comment_interval_seconds: 600,
          comment_max_requests: 6,
          image_interval_seconds: 3600,
          image_max_requests: 6,
          import_user_settings_interval_seconds: 86_400,
          import_user_settings_max_requests: 1,
          local_site_id: 1,
          message_interval_seconds: 600,
          message_max_requests: 60,
          post_interval_seconds: 600,
          post_max_requests: 6,
          published_at: now,
          register_interval_seconds: 3600,
          register_max_requests: 3,
          search_interval_seconds: 600,
          search_max_requests: 60,
        },
        site: {
          ap_id: `https://${host}/`,
          id: 1,
          inbox_url: `https://${host}/site_inbox`,
          instance_id: 1,
          last_refreshed_at: now,
          name: over.name ?? "Test v1 site",
          published_at: now,
        },
      },
      version,
    };
  }

  function pagedResponse<T>(
    items: T[],
    nextPage: null | string = null,
  ): { items: T[]; next_page: null | string; prev_page: null } {
    return { items, next_page: nextPage, prev_page: null };
  }

  return {
    commentNotification,
    commentView,
    community,
    communityResponse,
    communityView,
    getSiteResponse,
    localUser,
    modlogView,
    myUserInfo,
    pagedResponse,
    person,
    personResponse,
    post,
    postResponse,
    postView,
    privateMessageNotification,
    privateMessageView,
  };
}
