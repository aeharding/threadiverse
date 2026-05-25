import type * as LemmyV0 from "lemmy-js-client-v0";

import { InvalidPayloadError } from "../../errors";
import { cleanThreadiverseParams } from "../../helpers";
import * as types from "../../types";

export function fromListingType(type_?: types.ListingType) {
  if (!type_) return undefined;
  const map = {
    all: "All",
    local: "Local",
    moderator_view: "ModeratorView",
    subscribed: "Subscribed",
  } as const satisfies Record<types.ListingType, LemmyV0.ListingType>;
  return map[type_];
}

export function fromPageParams<const T extends types.PageParams>(
  params: T,
): Omit<Omit<T, "mode">, "page_cursor"> & { limit?: number; page?: number } {
  if (typeof params.page_cursor === "string")
    throw new InvalidPayloadError(
      "lemmyv0 does not support string page_cursor",
    );

  const { page_cursor, ...rest } = cleanThreadiverseParams(params);

  return {
    ...rest,
    limit: params.limit,
    page: page_cursor ? Number(page_cursor) : undefined,
  };
}

export function fromSearchType(
  type_?: types.SearchType,
): LemmyV0.SearchType | undefined {
  if (!type_) return undefined;
  const map: Record<types.SearchType, LemmyV0.SearchType> = {
    all: "All",
    comments: "Comments",
    communities: "Communities",
    posts: "Posts",
    users: "Users",
  };
  return map[type_];
}

/**
 * This is a total hack, because the lemmy-js-client types are incorrect for lemmy v0
 */
export function toBlocks(
  blocks: Pick<
    LemmyV0.MyUserInfo,
    "community_blocks" | "instance_blocks" | "person_blocks"
  >,
): Pick<
  types.MyUserInfo,
  "community_blocks" | "instance_blocks" | "person_blocks"
> {
  return {
    community_blocks: blocks.community_blocks
      .map((t) => ("community" in t ? (t.community as LemmyV0.Community) : t))
      .map(toCommunity),
    instance_blocks: blocks.instance_blocks
      .map((t) => ("instance" in t ? (t.instance as LemmyV0.Instance) : t))
      .map(toInstance),
    person_blocks: blocks.person_blocks
      .map((t) => ("target" in t ? (t.target as LemmyV0.Person) : t))
      .map((p) => toPerson(p)),
  };
}

export function toComment(
  comment: LemmyV0.Comment,
  counts: LemmyV0.CommentAggregates,
): types.Comment {
  return {
    ap_id: comment.ap_id,
    child_count: counts.child_count,
    content: comment.content,
    creator_id: comment.creator_id,
    deleted: comment.deleted,
    distinguished: comment.distinguished,
    downvotes: counts.downvotes,
    id: comment.id,
    language_id: comment.language_id,
    local: comment.local,
    path: comment.path,
    post_id: comment.post_id,
    published_at: comment.published,
    removed: comment.removed,
    score: counts.score,
    updated_at: comment.updated,
    upvotes: counts.upvotes,
  };
}

export function toCommentReport(
  report: LemmyV0.CommentReport,
): types.CommentReport {
  return {
    comment_id: report.comment_id,
    creator_id: report.creator_id,
    id: report.id,
    original_comment_text: report.original_comment_text,
    published_at: report.published,
    reason: report.reason,
    resolved: report.resolved,
    resolver_id: report.resolver_id,
    updated_at: report.updated,
  };
}

export function toCommentReportView(
  v: LemmyV0.CommentReportView,
): types.CommentReportView {
  return {
    comment: toComment(v.comment, v.counts),
    comment_creator: toPerson(v.comment_creator),
    comment_report: toCommentReport(v.comment_report),
    community: toCommunity(v.community),
    creator: toPerson(v.creator),
    creator_banned_from_community: v.creator_banned_from_community,
    creator_blocked: v.creator_blocked,
    creator_is_admin: v.creator_is_admin,
    creator_is_moderator: v.creator_is_moderator,
    my_vote: toVote(v.my_vote),
    post: toPost(v.post),
    resolver: v.resolver ? toPerson(v.resolver) : undefined,
    saved: v.saved,
    subscribed: v.subscribed,
  };
}

export function toCommentView(v: LemmyV0.CommentView): types.CommentView {
  return {
    banned_from_community: v.banned_from_community ?? false, // v0.13.3
    comment: toComment(v.comment, v.counts),
    community: toCommunity(v.community),
    creator: toPerson(v.creator),
    creator_banned_from_community: v.creator_banned_from_community,
    creator_is_admin: v.creator_is_admin,
    creator_is_moderator: v.creator_is_moderator,
    my_vote: toVote(v.my_vote),
    post: toPost(v.post),
    saved: v.saved,
    subscribed: v.subscribed,
  };
}

export function toCommunity(community: LemmyV0.Community): types.Community {
  return {
    ap_id: community.actor_id,
    banner: community.banner,
    comments: 0,
    deleted: community.deleted,
    icon: community.icon,
    id: community.id,
    local: community.local,
    name: community.name,
    nsfw: community.nsfw,
    posting_restricted_to_mods: community.posting_restricted_to_mods,
    posts: 0,
    published_at: community.published,
    removed: community.removed,
    sidebar: community.sidebar,
    subscribers: 0,
    subscribers_local: 0,
    summary: community.description,
    title: community.title,
    updated_at: community.updated,
    users_active_day: 0,
    users_active_half_year: 0,
    users_active_month: 0,
    users_active_week: 0,
    // v0's `hidden: true` semantically maps to v1's `visibility: "unlisted"`.
    visibility: community.hidden
      ? "unlisted"
      : compatCommunityVisibility(community.visibility),
  };
}

export function toCommunityFollowerView(
  v: LemmyV0.CommunityFollowerView,
): types.CommunityFollowerView {
  return {
    community: toCommunityWithCounts(v.community, undefined),
    follower: toPerson(v.follower),
  };
}

export function toCommunityModeratorView(
  v: LemmyV0.CommunityModeratorView,
): types.CommunityModeratorView {
  return {
    community: toCommunityWithCounts(v.community, undefined),
    moderator: toPerson(v.moderator),
  };
}

export function toCommunityView(v: LemmyV0.CommunityView): types.CommunityView {
  return {
    blocked: false,
    community: toCommunityWithCounts(v.community, v.counts),
    notifications: "replies_and_mentions",
    subscribed: v.subscribed,
  };
}

export function toInstance(instance: LemmyV0.Instance): types.Instance {
  return {
    domain: instance.domain,
    id: instance.id,
    published_at: instance.published,
    software: instance.software,
    updated_at: instance.updated,
    version: instance.version,
  };
}

export function toInstanceWithFederationState(
  instance: LemmyV0.InstanceWithFederationState,
): types.InstanceWithFederationState {
  return {
    domain: instance.domain,
    federation_state: instance.federation_state,
    id: instance.id,
    published_at: instance.published,
    software: instance.software,
    updated_at: instance.updated,
    version: instance.version,
  };
}

export function toLocalSite(
  localSite: LemmyV0.LocalSite,
  counts: LemmyV0.SiteAggregates,
): types.LocalSite {
  // @ts-expect-error - lemmy-js-client-v0 types are incorrect for this property
  const downvotes_disabled = localSite.enable_downvotes === false;
  const downvotesMode = downvotes_disabled ? "disable" : "all";

  return {
    application_question: localSite.application_question,
    captcha_enabled: localSite.captcha_enabled ?? false,
    comment_downvotes: downvotesMode,
    comment_upvotes: "all",
    comments: counts.comments,
    communities: counts.communities,
    email_verification_required: localSite.require_email_verification ?? false,
    legal_information: localSite.legal_information,
    post_downvotes: downvotesMode,
    post_upvotes: "all",
    posts: counts.posts,
    registration_mode: toRegistrationMode(localSite.registration_mode),
    users: counts.users,
    users_active_day: counts.users_active_day,
    users_active_half_year: counts.users_active_half_year,
    users_active_month: counts.users_active_month,
    users_active_week: counts.users_active_week,
  };
}

export function toMentionNotificationView(
  mention: LemmyV0.PersonMentionView,
): types.NotificationView {
  const commentView = toMentionView(mention);
  return {
    data: { ...commentView, type_: "comment" },
    notification: {
      comment_id: mention.comment.id,
      creator_id: mention.creator.id,
      id: mention.person_mention.id,
      kind: "mention",
      post_id: mention.post.id,
      published_at: mention.person_mention.published,
      read: mention.person_mention.read,
      recipient_id: mention.recipient.id,
    },
  };
}

export function toMentionView(v: LemmyV0.PersonMentionView): types.CommentView {
  return {
    banned_from_community: v.banned_from_community ?? false, // v0.13.3
    comment: toComment(v.comment, v.counts),
    community: toCommunity(v.community),
    creator: toPerson(v.creator),
    creator_banned_from_community: v.creator_banned_from_community,
    creator_is_admin: v.creator_is_admin,
    creator_is_moderator: v.creator_is_moderator,
    my_vote: toVote(v.my_vote),
    post: toPost(v.post),
    saved: v.saved,
    subscribed: v.subscribed,
  };
}

export function toModlogView(
  modlog: LemmyV0.GetModlogResponse[keyof LemmyV0.GetModlogResponse][number],
): types.ModlogItem | undefined {
  if ("mod_remove_post" in modlog) {
    return {
      moderator: modlog.moderator ? toPerson(modlog.moderator) : undefined,
      modlog: {
        id: modlog.mod_remove_post.id,
        is_revert: !modlog.mod_remove_post.removed,
        kind: "mod_remove_post",
        published_at: modlog.mod_remove_post.when_,
        reason: modlog.mod_remove_post.reason,
      },
      target_community: toCommunity(modlog.community),
      target_post: toPost(modlog.post),
    };
  }
  if ("mod_lock_post" in modlog) {
    return {
      moderator: modlog.moderator ? toPerson(modlog.moderator) : undefined,
      modlog: {
        id: modlog.mod_lock_post.id,
        is_revert: !modlog.mod_lock_post.locked,
        kind: "mod_lock_post",
        published_at: modlog.mod_lock_post.when_,
      },
      target_community: toCommunity(modlog.community),
      target_post: toPost(modlog.post),
    };
  }
  if ("mod_feature_post" in modlog) {
    return {
      moderator: modlog.moderator ? toPerson(modlog.moderator) : undefined,
      modlog: {
        id: modlog.mod_feature_post.id,
        is_revert: !modlog.mod_feature_post.featured,
        kind: modlog.mod_feature_post.is_featured_community
          ? "mod_feature_post_community"
          : "admin_feature_post_site",
        published_at: modlog.mod_feature_post.when_,
      },
      target_community: toCommunity(modlog.community),
      target_post: toPost(modlog.post),
    };
  }
  if ("mod_remove_comment" in modlog) {
    return {
      moderator: modlog.moderator ? toPerson(modlog.moderator) : undefined,
      modlog: {
        id: modlog.mod_remove_comment.id,
        is_revert: !modlog.mod_remove_comment.removed,
        kind: "mod_remove_comment",
        published_at: modlog.mod_remove_comment.when_,
        reason: modlog.mod_remove_comment.reason,
      },
      target_comment: toCommentWithoutCounts(modlog.comment),
      target_community: toCommunity(modlog.community),
      target_person: toPerson(modlog.commenter),
      target_post: toPost(modlog.post),
    };
  }
  if ("mod_remove_community" in modlog) {
    return {
      moderator: modlog.moderator ? toPerson(modlog.moderator) : undefined,
      modlog: {
        id: modlog.mod_remove_community.id,
        is_revert: !modlog.mod_remove_community.removed,
        kind: "admin_remove_community",
        published_at: modlog.mod_remove_community.when_,
        reason: modlog.mod_remove_community.reason,
      },
      target_community: toCommunity(modlog.community),
    };
  }
  if ("mod_ban_from_community" in modlog) {
    return {
      moderator: modlog.moderator ? toPerson(modlog.moderator) : undefined,
      modlog: {
        expires_at: modlog.mod_ban_from_community.expires,
        id: modlog.mod_ban_from_community.id,
        is_revert: !modlog.mod_ban_from_community.banned,
        kind: "mod_ban_from_community",
        published_at: modlog.mod_ban_from_community.when_,
        reason: modlog.mod_ban_from_community.reason,
      },
      target_community: toCommunity(modlog.community),
      target_person: toPerson(modlog.banned_person),
    };
  }
  if ("mod_ban" in modlog) {
    return {
      moderator: modlog.moderator ? toPerson(modlog.moderator) : undefined,
      modlog: {
        expires_at: modlog.mod_ban.expires,
        id: modlog.mod_ban.id,
        is_revert: !modlog.mod_ban.banned,
        kind: "admin_ban",
        published_at: modlog.mod_ban.when_,
        reason: modlog.mod_ban.reason,
      },
      target_person: toPerson(modlog.banned_person),
    };
  }
  if ("mod_add_community" in modlog) {
    return {
      moderator: modlog.moderator ? toPerson(modlog.moderator) : undefined,
      modlog: {
        id: modlog.mod_add_community.id,
        // removed=true means the add was reverted (person removed from mod role)
        is_revert: modlog.mod_add_community.removed ?? false,
        kind: "mod_add_to_community",
        published_at: modlog.mod_add_community.when_,
      },
      target_community: toCommunity(modlog.community),
      target_person: toPerson(modlog.modded_person),
    };
  }
  if ("mod_transfer_community" in modlog) {
    return {
      moderator: modlog.moderator ? toPerson(modlog.moderator) : undefined,
      modlog: {
        id: modlog.mod_transfer_community.id,
        is_revert: false,
        kind: "mod_transfer_community",
        published_at: modlog.mod_transfer_community.when_,
      },
      target_community: toCommunity(modlog.community),
      target_person: toPerson(modlog.modded_person),
    };
  }
  if ("mod_add" in modlog) {
    return {
      moderator: modlog.moderator ? toPerson(modlog.moderator) : undefined,
      modlog: {
        id: modlog.mod_add.id,
        // removed=true means the add was reverted (person removed as admin)
        is_revert: modlog.mod_add.removed ?? false,
        kind: "admin_add",
        published_at: modlog.mod_add.when_,
      },
      target_person: toPerson(modlog.modded_person),
    };
  }
  if ("admin_purge_person" in modlog) {
    return {
      moderator: modlog.admin ? toPerson(modlog.admin) : undefined,
      modlog: {
        id: modlog.admin_purge_person.id,
        is_revert: false,
        kind: "admin_purge_person",
        published_at: modlog.admin_purge_person.when_,
        reason: modlog.admin_purge_person.reason,
      },
    };
  }
  if ("admin_purge_community" in modlog) {
    return {
      moderator: modlog.admin ? toPerson(modlog.admin) : undefined,
      modlog: {
        id: modlog.admin_purge_community.id,
        is_revert: false,
        kind: "admin_purge_community",
        published_at: modlog.admin_purge_community.when_,
        reason: modlog.admin_purge_community.reason,
      },
    };
  }
  if ("admin_purge_post" in modlog) {
    return {
      moderator: modlog.admin ? toPerson(modlog.admin) : undefined,
      modlog: {
        id: modlog.admin_purge_post.id,
        is_revert: false,
        kind: "admin_purge_post",
        published_at: modlog.admin_purge_post.when_,
        reason: modlog.admin_purge_post.reason,
      },
      target_community: toCommunity(modlog.community),
    };
  }
  if ("admin_purge_comment" in modlog) {
    return {
      moderator: modlog.admin ? toPerson(modlog.admin) : undefined,
      modlog: {
        id: modlog.admin_purge_comment.id,
        is_revert: false,
        kind: "admin_purge_comment",
        published_at: modlog.admin_purge_comment.when_,
        reason: modlog.admin_purge_comment.reason,
      },
      target_post: toPost(modlog.post),
    };
  }
  if ("mod_hide_community" in modlog) {
    return {
      moderator: modlog.admin ? toPerson(modlog.admin) : undefined,
      modlog: {
        id: modlog.mod_hide_community.id,
        is_revert: !modlog.mod_hide_community.hidden,
        kind: "mod_change_community_visibility",
        published_at: modlog.mod_hide_community.when_,
        reason: modlog.mod_hide_community.reason,
      },
      target_community: toCommunity(modlog.community),
    };
  }
}

export function toPageResponse(
  params: types.PageParams,
): types.PagableResponse {
  const page_cursor = params.page_cursor;

  if (typeof page_cursor === "string")
    throw new InvalidPayloadError(
      "lemmyv0 does not support string page_cursor",
    );

  return {
    next_page: (page_cursor ?? 1) + 1,
  };
}

export function toPerson(
  person: LemmyV0.Person,
  counts?: LemmyV0.PersonAggregates,
): types.Person {
  return {
    ap_id: person.actor_id,
    avatar: person.avatar,
    bot_account: person.bot_account,
    comment_count: counts?.comment_count ?? 0,
    deleted: person.deleted,
    display_name: person.display_name,
    id: person.id,
    local: person.local,
    name: person.name,
    post_count: counts?.post_count ?? 0,
    published_at: person.published,
  };
}

export function toPersonView(v: LemmyV0.PersonView): types.PersonView {
  return {
    is_admin: v.is_admin,
    person: toPerson(v.person, v.counts),
  };
}

export function toPost(
  post: LemmyV0.Post,
  counts?: LemmyV0.PostAggregates,
): types.Post {
  return {
    alt_text: post.alt_text,
    ap_id: post.ap_id,
    body: post.body,
    comments: counts?.comments ?? 0,
    community_id: post.community_id,
    creator_id: post.creator_id,
    deleted: post.deleted,
    downvotes: counts?.downvotes ?? 0,
    embed_description: post.embed_description,
    embed_title: post.embed_title,
    featured_community: post.featured_community,
    featured_local: post.featured_local,
    id: post.id,
    language_id: post.language_id,
    local: post.local,
    locked: post.locked,
    name: post.name,
    newest_comment_time_at: counts?.newest_comment_time,
    nsfw: post.nsfw,
    published_at: post.published,
    removed: post.removed,
    score: counts?.score ?? 0,
    thumbnail_url: post.thumbnail_url,
    updated_at: post.updated,
    upvotes: counts?.upvotes ?? 0,
    url: post.url,
    url_content_type: post.url_content_type,
  };
}

export function toPostReport(report: LemmyV0.PostReport): types.PostReport {
  return {
    creator_id: report.creator_id,
    id: report.id,
    original_post_body: report.original_post_body,
    original_post_name: report.original_post_name,
    original_post_url: report.original_post_url,
    post_id: report.post_id,
    published_at: report.published,
    reason: report.reason,
    resolved: report.resolved,
    resolver_id: report.resolver_id,
    updated_at: report.updated,
  };
}

export function toPostReportView(
  v: LemmyV0.PostReportView,
): types.PostReportView {
  return {
    community: toCommunity(v.community),
    creator: toPerson(v.creator),
    creator_banned_from_community: v.creator_banned_from_community,
    creator_blocked: v.creator_blocked,
    creator_is_admin: v.creator_is_admin,
    creator_is_moderator: v.creator_is_moderator,
    hidden: v.hidden,
    my_vote: toVote(v.my_vote),
    post: toPost(v.post, v.counts),
    post_creator: toPerson(v.post_creator),
    post_report: toPostReport(v.post_report),
    read: v.read,
    resolver: v.resolver ? toPerson(v.resolver) : undefined,
    saved: v.saved,
    subscribed: v.subscribed,
    unread_comments: v.unread_comments,
  };
}

export function toPostView(v: LemmyV0.PostView): types.PostView {
  return {
    banned_from_community: v.banned_from_community ?? false, // v0.13.3
    community: toCommunity(v.community),
    creator: toPerson(v.creator),
    creator_banned_from_community: v.creator_banned_from_community,
    creator_blocked: v.creator_blocked,
    creator_is_admin: v.creator_is_admin,
    creator_is_moderator: v.creator_is_moderator,
    hidden: v.hidden ?? false, // v0.13.3
    my_vote: toVote(v.my_vote),
    notifications: "replies_and_mentions",
    post: toPost(v.post, v.counts),
    read: v.read,
    saved: v.saved,
    subscribed: v.subscribed,
    unread_comments: v.unread_comments,
  };
}

export function toPrivateMessage(
  message: LemmyV0.PrivateMessage,
): types.PrivateMessage {
  return {
    ap_id: message.ap_id,
    content: message.content,
    creator_id: message.creator_id,
    deleted: message.deleted,
    id: message.id,
    local: message.local,
    published_at: message.published,
    recipient_id: message.recipient_id,
    updated_at: message.updated,
  };
}

export function toPrivateMessageNotificationView(
  message: LemmyV0.PrivateMessageView,
): types.NotificationView {
  return {
    data: { ...toPrivateMessageView(message), type_: "private_message" },
    notification: {
      creator_id: message.creator.id,
      id: message.private_message.id,
      kind: "private_message",
      private_message_id: message.private_message.id,
      published_at: message.private_message.published,
      read: message.private_message.read,
      recipient_id: message.recipient.id,
    },
  };
}

export function toPrivateMessageView(
  v: LemmyV0.PrivateMessageView,
): types.PrivateMessageView {
  return {
    creator: toPerson(v.creator),
    private_message: toPrivateMessage(v.private_message),
    recipient: toPerson(v.recipient),
  };
}

export function toReplyNotificationView(
  reply: LemmyV0.CommentReplyView,
): types.NotificationView {
  const commentView = toReplyView(reply);
  return {
    data: { ...commentView, type_: "comment" },
    notification: {
      comment_id: reply.comment.id,
      creator_id: reply.creator.id,
      id: reply.comment_reply.id,
      kind: "reply",
      post_id: reply.post.id,
      published_at: reply.comment_reply.published,
      read: reply.comment_reply.read,
      recipient_id: reply.recipient.id,
    },
  };
}

export function toReplyView(v: LemmyV0.CommentReplyView): types.CommentView {
  return {
    banned_from_community: v.banned_from_community ?? false, // v0.13.3
    comment: toComment(v.comment, v.counts),
    community: toCommunity(v.community),
    creator: toPerson(v.creator),
    creator_banned_from_community: v.creator_banned_from_community,
    creator_is_admin: v.creator_is_admin,
    creator_is_moderator: v.creator_is_moderator,
    my_vote: toVote(v.my_vote),
    post: toPost(v.post),
    saved: v.saved,
    subscribed: v.subscribed,
  };
}

export function toSite(site: LemmyV0.Site): types.Site {
  return {
    ap_id: site.actor_id,
    banner: site.banner,
    icon: site.icon,
    name: site.name,
    sidebar: site.sidebar,
    summary: site.description,
  };
}

function compatCommunityVisibility(
  visibility: LemmyV0.CommunityVisibility,
): types.CommunityVisibility {
  switch (visibility) {
    case "LocalOnly":
      return "local_only_public";
    case "Private":
      return "private";
    case "Public":
      return "public";
    default:
      return "public";
  }
}

/**
 * v0's modlog returns the comment without its aggregates. Threadiverse's flat
 * `Comment` requires count fields, so fill with zeros.
 */
function toCommentWithoutCounts(comment: LemmyV0.Comment): types.Comment {
  return toComment(comment, {
    child_count: 0,
    comment_id: comment.id,
    downvotes: 0,
    published: comment.published,
    score: 0,
    upvotes: 0,
  });
}

/**
 * v0 nests `Community` inside CommentView/PostView/etc. without including the
 * corresponding aggregates. Fill with zeros so the flat `Community` type
 * remains satisfied.
 */
function toCommunityWithCounts(
  community: LemmyV0.Community,
  counts: LemmyV0.CommunityAggregates | undefined,
): types.Community {
  const base = toCommunity(community);
  if (!counts) return base;
  return {
    ...base,
    comments: counts.comments,
    posts: counts.posts,
    subscribers: counts.subscribers,
    subscribers_local: counts.subscribers_local,
    users_active_day: counts.users_active_day,
    users_active_half_year: counts.users_active_half_year,
    users_active_month: counts.users_active_month,
    users_active_week: counts.users_active_week,
  };
}

function toRegistrationMode(
  mode: LemmyV0.RegistrationMode,
): types.RegistrationMode {
  switch (mode) {
    case "Closed":
      return "closed";
    case "RequireApplication":
      return "require_application";
    case "Open":
    default:
      return "open";
  }
}

function toVote(my_vote: number | undefined): -1 | 1 | undefined {
  if (my_vote === undefined || my_vote === 0) return undefined;
  return my_vote > 0 ? 1 : -1;
}
