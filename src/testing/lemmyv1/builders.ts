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
      avatar: undefined,
      banner: undefined,
      bio: undefined,
      bot_account: false,
      comment_count: 0,
      deleted: false,
      display_name: over.display_name,
      id: over.id,
      instance_id: 1,
      last_refreshed_at: now,
      local: true,
      matrix_user_id: undefined,
      name: over.name,
      post_count: 0,
      published_at: now,
      updated_at: undefined,
    };
  }

  function community(
    over: { id?: number; name?: string; title?: string } = {},
  ): Wire<LemmyV1.Community> {
    const name = over.name ?? "test_comm";

    return {
      ap_id: `https://${host}/c/${name}`,
      banner: undefined,
      comments: 0,
      deleted: false,
      icon: undefined,
      id: over.id ?? 111,
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
      sidebar: undefined,
      subscribers: 1,
      subscribers_local: 1,
      summary: undefined,
      title: over.title ?? "Test Community",
      unresolved_report_count: 0,
      updated_at: undefined,
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
      alt_text: undefined,
      ap_id: `https://${host}/post/${over.id}`,
      body: over.body,
      comments: 0,
      community_id: (over.community ?? community()).id,
      creator_id: over.creator.id,
      deleted: false,
      downvotes: 0,
      embed_description: undefined,
      embed_title: undefined,
      embed_video_url: undefined,
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
      thumbnail_url: undefined,
      unresolved_report_count: 0,
      updated_at: undefined,
      upvotes: 1,
      url: over.url,
      url_content_type: undefined,
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
    return {
      can_mod: false,
      community: over.community ?? community(),
      community_actions: undefined,
      creator: over.creator,
      creator_ban_expires_at: undefined,
      creator_banned: false,
      creator_banned_from_community: false,
      creator_community_ban_expires_at: undefined,
      creator_is_admin: false,
      creator_is_moderator: false,
      image_details: undefined,
      person_actions: undefined,
      post: post(over),
      post_actions: undefined,
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
        updated_at: undefined,
        upvotes: 1,
      },
      comment_actions: undefined,
      community: over.post.community,
      community_actions: undefined,
      creator,
      creator_ban_expires_at: undefined,
      creator_banned: false,
      creator_banned_from_community: false,
      creator_community_ban_expires_at: undefined,
      creator_is_admin: false,
      creator_is_moderator: false,
      person_actions: undefined,
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
        updated_at: undefined,
      },
      recipient: over.recipient,
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
      target_instance: undefined,
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
      default_post_time_range_seconds: undefined,
      email: undefined,
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
        ban_expires_at: undefined,
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
        ban_expires_at: undefined,
        banned: false,
        is_admin: false,
        person: subject,
        person_actions: undefined,
      },
      site: undefined,
    };
  }

  /** `GET /api/v4/community` (getCommunity) */
  function communityResponse(
    over: { community?: Wire<LemmyV1.Community> } = {},
  ): Wire<LemmyV1.GetCommunityResponse> {
    return {
      community_view: {
        can_mod: false,
        community: over.community ?? community(),
        community_actions: undefined,
        tags: [],
      },
      discussion_languages: [],
      moderators: [],
      site: undefined,
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
      last_application_duration_seconds: undefined,
      oauth_providers: [],
      site_view: {
        instance: {
          domain: host,
          id: 1,
          published_at: now,
          software: "lemmy",
          updated_at: undefined,
          version,
        },
        local_site: {
          application_email_admins: false,
          application_question: undefined,
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
          default_post_time_range_seconds: undefined,
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
          image_proxy_bypass_domains: undefined,
          image_upload_disabled: false,
          image_upload_timeout_seconds: 30,
          legal_information: undefined,
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
          slur_filter_regex: undefined,
          suggested_multi_community_id: undefined,
          updated_at: undefined,
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
          updated_at: undefined,
        },
        site: {
          ap_id: `https://${host}/`,
          banner: undefined,
          content_warning: undefined,
          icon: undefined,
          id: 1,
          inbox_url: `https://${host}/site_inbox`,
          instance_id: 1,
          last_refreshed_at: now,
          name: over.name ?? "Test v1 site",
          published_at: now,
          sidebar: undefined,
          summary: undefined,
          updated_at: undefined,
        },
      },
      tagline: undefined,
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
    commentView,
    community,
    communityResponse,
    getSiteResponse,
    localUser,
    modlogView,
    myUserInfo,
    pagedResponse,
    person,
    personResponse,
    post,
    postView,
    privateMessageView,
  };
}
