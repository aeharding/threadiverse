import type * as LemmyV0 from "lemmy-js-client-v0";

import { InvalidPayloadError } from "../../errors";
import * as types from "../../types";

export function fromPageParams<const T extends types.PageParams>(
  params: T,
): Omit<T, "page_cursor"> & { limit?: number; page?: number } {
  const result: T = { ...params };

  const page_cursor = result.page_cursor;
  delete result.page_cursor;

  if (typeof page_cursor === "string")
    throw new InvalidPayloadError(
      "lemmyv0 does not support string page_cursor",
    );

  return {
    ...(result as Omit<T, "page_cursor">),
    limit: params.limit,
    page: page_cursor ? Number(page_cursor) : undefined,
  };
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
    instance_blocks: blocks.instance_blocks.map((t) =>
      "instance" in t ? (t.instance as LemmyV0.Instance) : t,
    ),
    person_blocks: blocks.person_blocks.map((t) =>
      "target" in t ? (t.target as LemmyV0.Person) : t,
    ),
  };
}

export function toCommentReportView(commentReport: LemmyV0.CommentReportView) {
  return {
    ...commentReport,
    community: toCommunity(commentReport.community),
  };
}

export function toCommentView(comment: LemmyV0.CommentView) {
  return {
    ...comment,
    banned_from_community: comment.banned_from_community ?? false, // v0.13.3
    community: toCommunity(comment.community),
  };
}

export function toCommunity(community: LemmyV0.Community) {
  return {
    ...community,
    hidden: community.hidden ?? false, // v0.13.3
    visibility: compatCommunityVisibility(community.visibility),
  };
}

export function toCommunityFollowerView(
  communityFollower: LemmyV0.CommunityFollowerView,
) {
  return {
    ...communityFollower,
    community: toCommunity(communityFollower.community),
  };
}

export function toCommunityModeratorView(
  communityModerator: LemmyV0.CommunityModeratorView,
) {
  return {
    ...communityModerator,
    community: toCommunity(communityModerator.community),
  };
}

export function toCommunityView(communityView: LemmyV0.CommunityView) {
  return {
    ...communityView,
    community: toCommunity(communityView.community),
  };
}

export function toListingType(
  type_?: types.ListingType,
): LemmyV0.ListingType | undefined {
  if (!type_) return undefined;
  const map: Record<types.ListingType, LemmyV0.ListingType> = {
    all: "All",
    local: "Local",
    moderator_view: "ModeratorView",
    subscribed: "Subscribed",
  };
  return map[type_];
}

export function toLocalSite(localSite: LemmyV0.LocalSite): types.LocalSite {
  // @ts-expect-error - lemmy-js-client-v0 types are incorrect for this property
  const downvotes_disabled = localSite.enable_downvotes === false;
  const downvotesMode = downvotes_disabled ? "disable" : "all";

  return {
    application_question: localSite.application_question,
    captcha_enabled: localSite.captcha_enabled ?? false,
    comment_downvotes: downvotesMode,
    comment_upvotes: "all",
    legal_information: localSite.legal_information,
    post_downvotes: downvotesMode,
    post_upvotes: "all",
    registration_mode: toRegistrationMode(localSite.registration_mode),
    require_email_verification: localSite.require_email_verification ?? false,
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

export function toMentionView(personMention: LemmyV0.PersonMentionView) {
  return {
    ...personMention,
    banned_from_community: personMention.banned_from_community ?? false, // v0.13.3
    community: toCommunity(personMention.community),
  };
}

export function toModlogView(
  modlog: LemmyV0.GetModlogResponse[keyof LemmyV0.GetModlogResponse][number],
): types.ModlogItem | undefined {
  if ("mod_remove_post" in modlog) {
    return {
      moderator: modlog.moderator,
      modlog: {
        id: modlog.mod_remove_post.id,
        is_revert: !modlog.mod_remove_post.removed,
        kind: "mod_remove_post",
        published_at: modlog.mod_remove_post.when_,
        reason: modlog.mod_remove_post.reason,
      },
      target_community: toCommunity(modlog.community),
      target_post: modlog.post,
    };
  }
  if ("mod_lock_post" in modlog) {
    return {
      moderator: modlog.moderator,
      modlog: {
        id: modlog.mod_lock_post.id,
        is_revert: !modlog.mod_lock_post.locked,
        kind: "mod_lock_post",
        published_at: modlog.mod_lock_post.when_,
      },
      target_community: toCommunity(modlog.community),
      target_post: modlog.post,
    };
  }
  if ("mod_feature_post" in modlog) {
    return {
      moderator: modlog.moderator,
      modlog: {
        id: modlog.mod_feature_post.id,
        is_revert: !modlog.mod_feature_post.featured,
        kind: modlog.mod_feature_post.is_featured_community
          ? "mod_feature_post_community"
          : "admin_feature_post_site",
        published_at: modlog.mod_feature_post.when_,
      },
      target_community: toCommunity(modlog.community),
      target_post: modlog.post,
    };
  }
  if ("mod_remove_comment" in modlog) {
    return {
      moderator: modlog.moderator,
      modlog: {
        id: modlog.mod_remove_comment.id,
        is_revert: !modlog.mod_remove_comment.removed,
        kind: "mod_remove_comment",
        published_at: modlog.mod_remove_comment.when_,
        reason: modlog.mod_remove_comment.reason,
      },
      target_comment: modlog.comment,
      target_community: toCommunity(modlog.community),
      target_person: modlog.commenter,
      target_post: modlog.post,
    };
  }
  if ("mod_remove_community" in modlog) {
    return {
      moderator: modlog.moderator,
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
      moderator: modlog.moderator,
      modlog: {
        expires_at: modlog.mod_ban_from_community.expires,
        id: modlog.mod_ban_from_community.id,
        is_revert: !modlog.mod_ban_from_community.banned,
        kind: "mod_ban_from_community",
        published_at: modlog.mod_ban_from_community.when_,
        reason: modlog.mod_ban_from_community.reason,
      },
      target_community: toCommunity(modlog.community),
      target_person: modlog.banned_person,
    };
  }
  if ("mod_ban" in modlog) {
    return {
      moderator: modlog.moderator,
      modlog: {
        expires_at: modlog.mod_ban.expires,
        id: modlog.mod_ban.id,
        is_revert: !modlog.mod_ban.banned,
        kind: "admin_ban",
        published_at: modlog.mod_ban.when_,
        reason: modlog.mod_ban.reason,
      },
      target_person: modlog.banned_person,
    };
  }
  if ("mod_add_community" in modlog) {
    return {
      moderator: modlog.moderator,
      modlog: {
        id: modlog.mod_add_community.id,
        // removed=true means the add was reverted (person removed from mod role)
        is_revert: modlog.mod_add_community.removed ?? false,
        kind: "mod_add_to_community",
        published_at: modlog.mod_add_community.when_,
      },
      target_community: toCommunity(modlog.community),
      target_person: modlog.modded_person,
    };
  }
  if ("mod_transfer_community" in modlog) {
    return {
      moderator: modlog.moderator,
      modlog: {
        id: modlog.mod_transfer_community.id,
        is_revert: false,
        kind: "mod_transfer_community",
        published_at: modlog.mod_transfer_community.when_,
      },
      target_community: toCommunity(modlog.community),
      target_person: modlog.modded_person,
    };
  }
  if ("mod_add" in modlog) {
    return {
      moderator: modlog.moderator,
      modlog: {
        id: modlog.mod_add.id,
        // removed=true means the add was reverted (person removed as admin)
        is_revert: modlog.mod_add.removed ?? false,
        kind: "admin_add",
        published_at: modlog.mod_add.when_,
      },
      target_person: modlog.modded_person,
    };
  }
  if ("admin_purge_person" in modlog) {
    return {
      moderator: modlog.admin,
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
      moderator: modlog.admin,
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
      moderator: modlog.admin,
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
      moderator: modlog.admin,
      modlog: {
        id: modlog.admin_purge_comment.id,
        is_revert: false,
        kind: "admin_purge_comment",
        published_at: modlog.admin_purge_comment.when_,
        reason: modlog.admin_purge_comment.reason,
      },
      target_post: modlog.post,
    };
  }
  if ("mod_hide_community" in modlog) {
    return {
      moderator: modlog.admin,
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

export function toPostReportView(postReport: LemmyV0.PostReportView) {
  return {
    ...postReport,
    community: toCommunity(postReport.community),
  };
}

export function toPostView(post: LemmyV0.PostView) {
  return {
    ...post,
    banned_from_community: post.banned_from_community ?? false, // v0.13.3
    community: toCommunity(post.community),
    hidden: post.hidden ?? false, // v0.13.3
  };
}

export function toPrivateMessageNotificationView(
  message: LemmyV0.PrivateMessageView,
): types.NotificationView {
  return {
    data: { ...message, type_: "private_message" },
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

export function toReplyView(personMention: LemmyV0.CommentReplyView) {
  return {
    ...personMention,
    banned_from_community: personMention.banned_from_community ?? false, // v0.13.3
    community: toCommunity(personMention.community),
  };
}

export function toSearchType(
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
