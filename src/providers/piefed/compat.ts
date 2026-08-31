import { InvalidPayloadError, UnexpectedResponseError } from "../../errors";
import * as types from "../../types";
import * as lemmyCompat from "../lemmyv0/compat";
import { components } from "./schema";

export const toPageResponse = lemmyCompat.toPageResponse;
export const fromPageParams = lemmyCompat.fromPageParams;
export const fromSearchType = lemmyCompat.fromSearchType;

type PiefedComment = components["schemas"]["Comment"];
type PiefedCommentAggregates = components["schemas"]["CommentAggregates"];
type PiefedCommentReport = components["schemas"]["CommentReport"];
type PiefedCommunity = components["schemas"]["Community"];
type PiefedCommunityAggregates = components["schemas"]["CommunityAggregates"];
type PiefedInstance = components["schemas"]["Instance"];
type PiefedModlogResponse = components["schemas"]["GetModLogResponse"];
type PiefedModlogView =
  PiefedModlogResponse[keyof PiefedModlogResponse][number];
type PiefedPerson = components["schemas"]["Person"];
type PiefedPersonAggregates = components["schemas"]["PersonAggregates"];
type PiefedPost = components["schemas"]["Post"];
type PiefedPostAggregates = components["schemas"]["PostAggregates"];
type PiefedPostReport = components["schemas"]["PostReport"];
type PiefedPrivateMessage = components["schemas"]["PrivateMessage"];

export function compareModlogChronology(
  a: types.ModlogItem,
  b: types.ModlogItem,
): number {
  const aTimestamp = Date.parse(a.modlog.published_at);
  const bTimestamp = Date.parse(b.modlog.published_at);
  if (!Number.isFinite(aTimestamp) || !Number.isFinite(bTimestamp))
    throw new UnexpectedResponseError("Invalid PieFed modlog timestamp");

  return bTimestamp - aTimestamp;
}

export function compareModlogItems(
  a: types.ModlogItem,
  b: types.ModlogItem,
): number {
  const chronological = compareModlogChronology(a, b);
  if (chronological !== 0) return chronological;

  const byKind = a.modlog.kind.localeCompare(b.modlog.kind);
  if (byKind !== 0) return byKind;

  return b.modlog.id - a.modlog.id;
}

export function fromCommunityNotificationsMode(
  mode: types.CommunityNotificationsMode,
): boolean {
  switch (mode) {
    case "all_posts":
      return true;
    case "replies_and_mentions":
      return false;
    case "all_posts_and_comments":
    case "mute":
      throw new InvalidPayloadError(
        `PieFed cannot represent community notification mode ${mode}`,
      );
  }
}

export function fromListingType(listingType: types.ListingType | undefined) {
  switch (listingType) {
    case "all":
      return "All";
    case "local":
      return "Local";
    case "moderator_view":
      return "ModeratorView";
    case "subscribed":
      return "Subscribed";
    case undefined:
      return undefined;
  }
}

export function fromPostNotificationsMode(
  mode: types.PostNotificationsMode,
): boolean {
  switch (mode) {
    case "all_comments":
      return true;
    case "replies_and_mentions":
      return false;
    case "mute":
      throw new InvalidPayloadError(
        `PieFed cannot represent post notification mode ${mode}`,
      );
  }
}

export function toCommentReplyView(
  reply: components["schemas"]["CommentReplyView"],
) {
  return {
    ...reply,
    banned_from_community: false, // TODO this isn't being returned rn
    comment: toComment(reply.comment, reply.counts, reply.creator.id),
    community: toCommunity(reply.community, piefedDefaultCommunityCounts()),
    creator: toPerson(reply.creator),
    post: toPost(reply.post, piefedDefaultPostCounts()),
    recipient: toPerson(reply.recipient),
  };
}

export function toCommentReportView(
  view: components["schemas"]["CommentReportView"],
): types.CommentReportView {
  return {
    comment: toComment(view.comment, view.counts, view.comment_creator.id),
    comment_creator: toPerson(view.comment_creator),
    comment_report: toCommentReport(view.comment_report, view.comment.body),
    community: toCommunity(view.community, piefedDefaultCommunityCounts()),
    // PieFed currently fills this view field with the authenticated moderator
    // even though comment_report.creator_id identifies the reporter. Preserve
    // the only full Person the wire provides; the adapter cannot reconstruct
    // the reporter's profile from an id alone.
    creator: toPerson(view.creator),
    creator_banned_from_community: view.creator_banned_from_community,
    creator_blocked: view.creator_blocked,
    creator_is_admin: view.creator_is_admin,
    creator_is_moderator: view.creator_is_moderator,
    my_vote: view.my_vote,
    post: toPost(view.post, piefedDefaultPostCounts()),
    resolver: undefined,
    saved: view.saved,
    subscribed: toSubscribedType(view.subscribed),
  };
}

export function toCommentView(
  v: components["schemas"]["CommentView"],
): types.CommentView {
  return {
    banned_from_community: v.banned_from_community,
    comment: toComment(v.comment, v.counts, v.creator.id),
    community: toCommunity(v.community, piefedDefaultCommunityCounts()),
    creator: toPerson(v.creator),
    creator_banned_from_community: v.creator_banned_from_community,
    creator_is_admin: v.creator_is_admin,
    creator_is_moderator: v.creator_is_moderator,
    my_vote: v.my_vote,
    post: toPost(v.post, piefedDefaultPostCounts()),
    saved: v.saved,
    // TODO: is this correct? Piefed types are wide (string) here
    subscribed: toSubscribedType(v.subscribed),
  };
}

export function toCommunity(
  community: PiefedCommunity,
  counts?: PiefedCommunityAggregates,
): types.Community {
  return {
    ap_id: community.actor_id,
    banner: community.banner ?? undefined,
    comments: counts?.post_reply_count ?? 0,
    deleted: community.deleted,
    icon: community.icon ?? undefined,
    id: community.id,
    local: community.local,
    name: community.name,
    nsfw: community.nsfw,
    posting_restricted_to_mods: community.restricted_to_mods,
    posts: counts?.post_count ?? 0,
    published_at: community.published,
    removed: community.removed,
    sidebar: community.description,
    subscribers: counts?.subscriptions_count ?? 0,
    subscribers_local: counts?.total_subscriptions_count ?? 0,
    summary: undefined,
    title: community.title,
    updated_at: community.updated,
    users_active_day: counts?.active_daily ?? 0,
    users_active_half_year: counts?.active_6monthly ?? 0,
    users_active_month: counts?.active_monthly ?? 0,
    users_active_week: counts?.active_weekly ?? 0,
    // piefed has no `visibility` enum; hidden=true maps to "unlisted".
    visibility: community.hidden ? "unlisted" : "public",
  };
}

export function toCommunityModeratorView(
  view: components["schemas"]["CommunityModeratorView"],
) {
  return {
    ...view,
    community: toCommunity(view.community, piefedDefaultCommunityCounts()),
    moderator: toPerson(view.moderator),
  };
}

export function toCommunityView(
  v: components["schemas"]["CommunityView"],
): types.CommunityView {
  return {
    blocked: v.blocked,
    community: toCommunity(v.community, v.counts),
    notifications: v.activity_alert ? "all_posts" : "replies_and_mentions",
    subscribed: toSubscribedType(v.subscribed),
  };
}

export function toGetCommunityResponse(
  response: components["schemas"]["GetCommunityResponse"],
) {
  return {
    community_view: toCommunityView(response.community_view),
    moderators: response.moderators.map(toCommunityModeratorView),
  };
}

export function toInstance(instance: PiefedInstance): types.Instance {
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
  instance: components["schemas"]["InstanceWithoutFederationState"],
): types.InstanceWithFederationState {
  return {
    domain: instance.domain,
    federation_state: undefined,
    id: instance.id,
    published_at: instance.published,
    software: instance.software,
    updated_at: instance.updated,
    version: instance.version,
  };
}

export function toLocalSite(
  site: components["schemas"]["Site"],
): types.LocalSite {
  // Current PieFed always emits enable_downvotes, but the OpenAPI field is
  // optional and older deployments omitted it. Preserve the historical
  // enabled behavior unless the server explicitly disables downvotes.
  const downvotes = site.enable_downvotes === false ? "disable" : "all";

  return {
    captcha_enabled: false,
    comment_downvotes: downvotes,
    comment_upvotes: "all",
    comments: 0,
    communities: 0,
    email_verification_required: false,
    legal_information: undefined,
    post_downvotes: downvotes,
    post_upvotes: "all",
    posts: 0,
    registration_mode: toRegistrationMode(site.registration_mode),
    users: site.user_count ?? 0,
    users_active_day: 0,
    users_active_half_year: 0,
    users_active_month: 0,
    users_active_week: 0,
  };
}

export function toMentionNotificationView(
  mention: components["schemas"]["CommentReplyView"],
): types.NotificationView {
  return {
    data: { ...toCommentReplyView(mention), type_: "comment" },
    notification: {
      comment_id: mention.comment.id,
      creator_id: mention.creator.id,
      id: mention.comment_reply.id,
      kind: "mention",
      post_id: mention.post.id,
      published_at: mention.comment_reply.published,
      read: mention.comment_reply.read,
      recipient_id: mention.recipient.id,
    },
  };
}

/**
 * Map PieFed's generic type-6 notifications. Post mentions contain their full
 * post view; comment mentions require the caller to hydrate `/comment` because
 * the notification wire row omits the aggregates needed by canonical data.
 */
export function toMentionNotificationViewFromGeneric(
  item: components["schemas"]["UserNotificationItemView"],
  recipientId: number,
  commentView?: components["schemas"]["CommentView"],
): types.NotificationView | undefined {
  if (item.notif_type !== 6) return undefined;

  const notification = {
    creator_id: item.author.id,
    id: item.notif_id,
    kind: "mention" as const,
    read: item.status === "Read",
    recipient_id: recipientId,
  };

  switch (item.notif_subtype) {
    case "comment_mention": {
      if (!commentView || item.comment_id === undefined)
        throw new UnexpectedResponseError(
          `Malformed PieFed comment mention ${item.notif_id}: missing comment`,
        );
      if (commentView.comment.id !== item.comment_id)
        throw new UnexpectedResponseError(
          `Malformed PieFed comment mention ${item.notif_id}: hydrated comment id does not match`,
        );

      const canonicalComment = toCommentView(commentView);
      return {
        data: { ...canonicalComment, type_: "comment" },
        notification: {
          ...notification,
          comment_id: item.comment_id,
          post_id: canonicalComment.post.id,
          // PieFed omits Notification.created_at.
          published_at: canonicalComment.comment.published_at,
        },
      };
    }
    case "post_mention": {
      if (!item.post)
        throw new UnexpectedResponseError(
          `Malformed PieFed post mention ${item.notif_id}: missing post`,
        );

      const canonicalPost = toPostView(item.post);
      return {
        data: { ...canonicalPost, type_: "post" },
        notification: {
          ...notification,
          post_id: canonicalPost.post.id,
          // PieFed omits Notification.created_at.
          published_at: canonicalPost.post.published_at,
        },
      };
    }
    default:
      throw new UnexpectedResponseError(
        `Unsupported PieFed mention subtype: ${item.notif_subtype}`,
      );
  }
}

/** Flatten PieFed's action-specific modlog buckets into the canonical union. */
export function toModlogItems(
  response: PiefedModlogResponse,
): types.ModlogItem[] {
  return Object.values(response)
    .flat()
    .map(toModlogView)
    .sort(compareModlogItems);
}

export function toModlogView(view: PiefedModlogView): types.ModlogItem {
  if ("mod_remove_post" in view) {
    const action = view.mod_remove_post;
    return {
      moderator: optionalPerson(view.moderator),
      modlog: {
        id: action.id,
        is_revert: !action.removed,
        kind: "mod_remove_post",
        published_at: action.when_,
        reason: action.reason ?? undefined,
      },
      target_community: optionalCommunity(view.community),
      target_post: optionalPost(view.post),
    };
  }

  if ("mod_lock_post" in view) {
    const action = view.mod_lock_post;
    return {
      moderator: optionalPerson(view.moderator),
      modlog: {
        id: action.id,
        is_revert: !action.locked,
        kind: "mod_lock_post",
        published_at: action.when_,
      },
      target_community: optionalCommunity(view.community),
      target_post: optionalPost(view.post),
    };
  }

  if ("mod_feature_post" in view) {
    const action = view.mod_feature_post;
    return {
      moderator: optionalPerson(view.moderator),
      modlog: {
        id: action.id,
        is_revert: !action.featured,
        kind: action.is_featured_community
          ? "mod_feature_post_community"
          : "admin_feature_post_site",
        published_at: action.when_,
      },
      target_community: optionalCommunity(view.community),
      target_post: optionalPost(view.post),
    };
  }

  if ("mod_remove_comment" in view) {
    const action = view.mod_remove_comment;
    return {
      moderator: optionalPerson(view.moderator),
      modlog: {
        id: action.id,
        is_revert: !action.removed,
        kind: "mod_remove_comment",
        published_at: action.when_,
        reason: action.reason ?? undefined,
      },
      target_comment: optionalComment(view.comment),
      target_community: optionalCommunity(view.community),
      target_person: optionalPerson(view.commenter),
      target_post: optionalPost(view.post),
    };
  }

  if ("mod_remove_community" in view) {
    const action = view.mod_remove_community;
    return {
      moderator: optionalPerson(view.moderator),
      modlog: {
        id: action.id,
        is_revert: !action.removed,
        // Threadiverse retains Lemmy's historical name for this action.
        kind: "admin_remove_community",
        published_at: action.when_,
        reason: action.reason ?? undefined,
      },
      target_community: optionalCommunity(view.community),
    };
  }

  if ("mod_ban_from_community" in view) {
    const action = view.mod_ban_from_community;
    return {
      moderator: optionalPerson(view.moderator),
      modlog: {
        expires_at: action.expires ?? undefined,
        id: action.id,
        is_revert: !action.banned,
        kind: "mod_ban_from_community",
        published_at: action.when_,
        reason: action.reason ?? undefined,
      },
      target_community: optionalCommunity(view.community),
      target_person: optionalPerson(view.banned_person),
    };
  }

  if ("mod_ban" in view) {
    const action = view.mod_ban;
    return {
      moderator: optionalPerson(view.moderator),
      modlog: {
        expires_at: action.expires ?? undefined,
        id: action.id,
        is_revert: !action.banned,
        kind: "admin_ban",
        published_at: action.when_,
        reason: action.reason ?? undefined,
      },
      target_person: optionalPerson(view.banned_person),
    };
  }

  if ("mod_add_community" in view) {
    const action = view.mod_add_community;
    return {
      moderator: optionalPerson(view.moderator),
      modlog: {
        id: action.id,
        is_revert: action.removed,
        kind: "mod_add_to_community",
        published_at: action.when_,
      },
      target_community: optionalCommunity(view.community),
      target_person: optionalPerson(view.modded_person),
    };
  }

  if ("mod_transfer_community" in view) {
    const action = view.mod_transfer_community;
    return {
      moderator: optionalPerson(view.moderator),
      modlog: {
        id: action.id,
        is_revert: false,
        kind: "mod_transfer_community",
        published_at: action.when_,
      },
      target_community: toCommunity(view.community),
      target_person: optionalPerson(view.modded_person),
    };
  }

  if ("mod_add" in view) {
    const action = view.mod_add;
    return {
      moderator: optionalPerson(view.moderator),
      modlog: {
        id: action.id,
        is_revert: action.removed,
        kind: "admin_add",
        published_at: action.when_,
      },
      target_person: optionalPerson(view.modded_person),
    };
  }

  if ("admin_purge_person" in view) {
    const action = view.admin_purge_person;
    return {
      moderator: optionalPerson(view.admin),
      modlog: {
        id: action.id,
        is_revert: false,
        kind: "admin_purge_person",
        published_at: action.when_,
        reason: action.reason ?? undefined,
      },
    };
  }

  if ("admin_purge_community" in view) {
    const action = view.admin_purge_community;
    return {
      moderator: optionalPerson(view.admin),
      modlog: {
        id: action.id,
        is_revert: false,
        kind: "admin_purge_community",
        published_at: action.when_,
        reason: action.reason ?? undefined,
      },
    };
  }

  if ("admin_purge_post" in view) {
    const action = view.admin_purge_post;
    return {
      moderator: optionalPerson(view.admin),
      modlog: {
        id: action.id,
        is_revert: false,
        kind: "admin_purge_post",
        published_at: action.when_,
        reason: action.reason ?? undefined,
      },
      target_community: toCommunity(view.community),
    };
  }

  if ("admin_purge_comment" in view) {
    const action = view.admin_purge_comment;
    return {
      moderator: optionalPerson(view.admin),
      modlog: {
        id: action.id,
        is_revert: false,
        kind: "admin_purge_comment",
        published_at: action.when_,
        reason: action.reason ?? undefined,
      },
      target_post: toPost(view.post, piefedDefaultPostCounts()),
    };
  }

  if ("mod_hide_community" in view) {
    const action = view.mod_hide_community;
    return {
      moderator: optionalPerson(view.admin),
      modlog: {
        id: action.id,
        is_revert: !action.hidden,
        kind: "mod_change_community_visibility",
        published_at: action.when_,
        reason: action.reason ?? undefined,
      },
      target_community: toCommunity(view.community),
    };
  }

  view satisfies never;
  throw new UnexpectedResponseError("Unknown PieFed modlog action");
}

export function toPerson(
  person: PiefedPerson,
  counts?: PiefedPersonAggregates,
): types.Person {
  return {
    ap_id: person.actor_id,
    avatar: person.avatar ?? undefined,
    banner: person.banner ?? undefined,
    bio: person.about ?? undefined,
    bot_account: person.bot,
    comment_count: counts?.comment_count ?? 0,
    deleted: person.deleted,
    display_name: person.title ?? undefined,
    id: person.id,
    local: person.local,
    name: person.user_name,
    post_count: counts?.post_count ?? 0,
    published_at: person.published ?? "",
  };
}

export function toPersonMentionView(
  mention: components["schemas"]["CommentReplyView"],
) {
  return {
    ...mention,
    banned_from_community: false, // TODO isn't being returned rn
    comment: toComment(mention.comment, mention.counts, mention.creator.id),
    community: toCommunity(mention.community, piefedDefaultCommunityCounts()),
    creator: toPerson(mention.creator),
    person_mention: mention.comment_reply,
    post: toPost(mention.post, piefedDefaultPostCounts()),
    recipient: toPerson(mention.recipient),
  };
}

export function toPersonView(personView: components["schemas"]["PersonView"]) {
  return {
    is_admin: personView.is_admin,
    person: toPerson(personView.person, personView.counts),
  };
}

export function toPostReportView(
  view: components["schemas"]["PostReportView"],
): types.PostReportView {
  return {
    community: toCommunity(view.community, piefedDefaultCommunityCounts()),
    // See the equivalent upstream mismatch on CommentReportView.creator.
    creator: toPerson(view.creator),
    creator_banned_from_community: view.creator_banned_from_community,
    creator_blocked: view.creator_blocked,
    creator_is_admin: view.creator_is_admin,
    creator_is_moderator: view.creator_is_moderator,
    hidden: false,
    my_vote: undefined,
    notifications: "replies_and_mentions",
    post: toPost(view.post, view.counts),
    post_creator: toPerson(view.post_creator),
    post_report: toPostReport(view.post_report),
    read: false,
    resolver: undefined,
    saved: view.saved,
    subscribed: toSubscribedType(view.subscribed),
    tags: [],
    unread_comments: view.counts.comments,
  };
}

export function toPostView(
  v: components["schemas"]["PostView"],
): types.PostView {
  return {
    banned_from_community: v.banned_from_community,
    community: toCommunity(v.community, piefedDefaultCommunityCounts()),
    creator: toPerson(v.creator),
    creator_banned_from_community: v.creator_banned_from_community,
    creator_blocked: false, // TODO piefed does not return this
    creator_is_admin: v.creator_is_admin,
    creator_is_moderator: v.creator_is_moderator,
    hidden: v.hidden,
    my_vote: v.my_vote,
    notifications: v.activity_alert ? "all_comments" : "replies_and_mentions",
    post: toPost(v.post, v.counts),
    read: v.read,
    saved: v.saved,
    subscribed: toSubscribedType(v.subscribed),
    tags: (v.flair_list ?? []).map((f) => ({
      color: f.background_color,
      name: f.flair_title,
    })),
    unread_comments: v.counts.comments,
  };
}

export function toPrivateMessageNotificationView(
  message: components["schemas"]["PrivateMessageView"],
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
  message: components["schemas"]["PrivateMessageView"],
): types.PrivateMessageView {
  return {
    creator: toPerson(message.creator),
    private_message: toPrivateMessage(message.private_message),
    recipient: toPerson(message.recipient),
  };
}

export function toReplyNotificationView(
  reply: components["schemas"]["CommentReplyView"],
): types.NotificationView {
  return {
    data: { ...toCommentReplyView(reply), type_: "comment" },
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

export function toSite(site: components["schemas"]["Site"]): types.Site {
  return {
    ap_id: site.actor_id,
    banner: undefined,
    icon: site.icon ?? undefined,
    name: site.name,
    sidebar: site.sidebar,
    summary: site.description,
  };
}

/**
 * Map PieFed's followed user/community/topic/feed notifications. Its numeric
 * types 3 and 4 also use NotificationSubscription internally, but PieFed's
 * public API has historically classified those post/comment responses as
 * replies (and cannot distinguish automatic from elective subscriptions), so
 * preserving that classification avoids returning one event under two kinds.
 */
export function toSubscribedNotificationView(
  item: components["schemas"]["UserNotificationItemView"],
  recipientId: number,
): types.NotificationView | undefined {
  if (![0, 1, 2, 5].includes(item.notif_type)) return undefined;

  const post = item.post;
  if (!post)
    throw new UnexpectedResponseError(
      `Malformed PieFed subscribed notification ${item.notif_id}: missing post`,
    );

  const read = item.status === "Read";

  const postView = toPostView(post);
  return {
    data: { ...postView, type_: "post" },
    notification: {
      creator_id: item.author.id,
      id: item.notif_id,
      kind: "subscribed",
      post_id: post.post.id,
      // PieFed omits Notification.created_at. These rows are created from the
      // followed-post event, so the post timestamp is the closest wire truth.
      published_at: post.post.published,
      read,
      recipient_id: recipientId,
    },
  };
}

function optionalComment(
  comment: null | PiefedComment | undefined,
): types.Comment | undefined {
  return comment
    ? toComment(comment, piefedDefaultCommentCounts(comment), comment.user_id)
    : undefined;
}

function optionalCommunity(
  community: null | PiefedCommunity | undefined,
): types.Community | undefined {
  return community ? toCommunity(community) : undefined;
}

function optionalPerson(
  person: null | PiefedPerson | undefined,
): types.Person | undefined {
  return person ? toPerson(person) : undefined;
}

function optionalPost(
  post: null | PiefedPost | undefined,
): types.Post | undefined {
  return post ? toPost(post, piefedDefaultPostCounts()) : undefined;
}

function piefedDefaultCommentCounts(
  comment: PiefedComment,
): PiefedCommentAggregates {
  return {
    child_count: 0,
    comment_id: comment.id,
    downvotes: 0,
    published: comment.published,
    score: 0,
    upvotes: 0,
  };
}

// PieFed's CommentReplyView / mention / community sidebar views nest their
// `Community`/`Post` without including the corresponding aggregates. Fill
// with zeros so downstream consumers don't crash on missing fields.
function piefedDefaultCommunityCounts(): PiefedCommunityAggregates {
  return {
    id: 0,
    post_count: 0,
    post_reply_count: 0,
    published: "",
    subscriptions_count: 0,
    total_subscriptions_count: 0,
  };
}

function piefedDefaultPostCounts(): PiefedPostAggregates {
  return {
    comments: 0,
    cross_posts: 0,
    downvotes: 0,
    newest_comment_time: "",
    post_id: 0,
    published: "",
    score: 0,
    upvotes: 0,
  };
}

function toComment(
  comment: PiefedComment,
  counts: PiefedCommentAggregates,
  creator_id: number,
): types.Comment {
  return {
    ap_id: comment.ap_id,
    child_count: counts.child_count,
    content: comment.body,
    creator_id, // TODO piefed types are wrong, this isn't being returned rn
    deleted: comment.deleted,
    distinguished: comment.distinguished ?? false,
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

function toCommentReport(
  report: PiefedCommentReport,
  currentCommentText: string,
): types.CommentReport {
  const reason = report.reason;
  const description = report.description;

  return {
    comment_id: report.comment_id,
    creator_id: report.creator_id,
    id: report.id,
    original_comment_text: report.original_comment_text ?? currentCommentText,
    published_at: report.published,
    reason:
      reason && description
        ? `${reason}\n\n${description}`
        : (reason ?? description ?? ""),
    resolved: report.resolved,
    resolver_id: undefined,
    updated_at: report.updated,
  };
}

function toPost(post: PiefedPost, counts: PiefedPostAggregates): types.Post {
  return {
    alt_text: post.alt_text,
    ap_id: post.ap_id,
    body: post.body,
    comments: counts.comments,
    community_id: post.community_id,
    creator_id: post.user_id,
    deleted: post.deleted,
    downvotes: counts.downvotes,
    embed_description: undefined,
    embed_title: undefined,
    featured_community: post.sticky,
    featured_local: false,
    id: post.id,
    language_id: post.language_id,
    local: post.local,
    locked: post.locked,
    name: post.title,
    newest_comment_time_at: counts.newest_comment_time,
    nsfw: post.nsfw,
    published_at: post.published,
    removed: post.removed,
    score: counts.score,
    thumbnail_url: post.thumbnail_url,
    updated_at: post.updated,
    upvotes: counts.upvotes,
    url: post.url,
    url_content_type: undefined,
  };
}

function toPostReport(report: PiefedPostReport): types.PostReport {
  return {
    creator_id: report.creator_id,
    id: report.id,
    original_post_body: report.original_post_body,
    original_post_name: report.original_post_name,
    original_post_url: undefined,
    post_id: report.post_id,
    published_at: report.published,
    reason: report.reason,
    resolved: report.resolved,
    resolver_id: undefined,
    updated_at: undefined,
  };
}

function toPrivateMessage(message: PiefedPrivateMessage): types.PrivateMessage {
  return {
    ap_id: message.ap_id,
    content: message.content,
    creator_id: message.creator_id,
    deleted: message.deleted,
    id: message.id,
    local: message.local,
    published_at: message.published,
    recipient_id: message.recipient_id,
    updated_at: undefined,
  };
}

function toRegistrationMode(
  mode: components["schemas"]["Site"]["registration_mode"],
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

function toSubscribedType(subscribed: string): types.SubscribedType {
  switch (subscribed) {
    case "ApprovalRequired":
      return "ApprovalRequired";
    case "Pending":
      return "Pending";
    case "Subscribed":
      return "Subscribed";
    default:
      return "NotSubscribed";
  }
}
