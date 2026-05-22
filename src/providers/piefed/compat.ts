import * as types from "../../types";
import * as lemmyCompat from "../lemmyv0/compat";
import { components } from "./schema";

export const toPageResponse = lemmyCompat.toPageResponse;
export const fromPageParams = lemmyCompat.fromPageParams;

export function toComment(
  comment: components["schemas"]["Comment"],
  creator_id: number // TODO piefed types are wrong, this isn't being returned rn
) {
  return {
    ...comment,
    content: comment.body,
    creator_id,
    distinguished: comment.distinguished ?? false,
  };
}

export function toCommentReplyView(
  reply: components["schemas"]["CommentReplyView"]
) {
  return {
    ...reply,
    banned_from_community: false, // TODO this isn't being returned rn
    comment: toComment(reply.comment, reply.creator.id),
    community: toCommunity(reply.community),
    creator: toPerson(reply.creator),
    post: toPost(reply.post),
    recipient: toPerson(reply.recipient),
  };
}

export function toCommentView(
  comment: components["schemas"]["CommentView"]
): types.CommentView {
  return {
    ...comment,
    comment: toComment(comment.comment, comment.creator.id),
    community: toCommunity(comment.community),
    creator: toPerson(comment.creator),
    post: toPost(comment.post),

    // TODO: is this correct? Piefed types are wide (string) here
    subscribed: comment.subscribed as types.CommentView["subscribed"],
  };
}

export function toCommunity(
  community: components["schemas"]["Community"]
): types.Community {
  return {
    ...community,
    banner: community.banner ?? undefined,
    icon: community.icon ?? undefined,
    posting_restricted_to_mods: community.restricted_to_mods,
    visibility: "public",
  };
}

export function toCommunityModeratorView(
  view: components["schemas"]["CommunityModeratorView"]
) {
  return {
    ...view,
    community: toCommunity(view.community),
    moderator: toPerson(view.moderator),
  };
}

export function toCommunityView(
  community: components["schemas"]["CommunityView"]
): types.CommunityView {
  return {
    ...community,
    community: toCommunity(community.community),
    counts: {
      comments: community.counts.post_reply_count,
      posts: community.counts.post_count,
      subscribers: community.counts.subscriptions_count,
      users_active_day: community.counts.active_6monthly,
      users_active_half_year: community.counts.active_6monthly,
      users_active_month: community.counts.active_monthly,
      users_active_week: community.counts.active_weekly,
    },
  };
}

export function toGetCommunityResponse(
  response: components["schemas"]["GetCommunityResponse"]
) {
  return {
    community_view: toCommunityView(response.community_view),
    moderators: response.moderators.map(toCommunityModeratorView),
  };
}

export function toListingType(
  listingType: types.ListingType | undefined
):
  | "All"
  | "Local"
  | "Moderating"
  | "ModeratorView"
  | "Popular"
  | "Subscribed"
  | undefined {
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

export function toLocalSite(
  site: components["schemas"]["Site"]
): types.LocalSite {
  return {
    captcha_enabled: false,
    comment_downvotes: "all",
    comment_upvotes: "all",
    post_downvotes: "all",
    post_upvotes: "all",
    registration_mode: toRegistrationMode(site.registration_mode),
    require_email_verification: false,
  };
}

export function toMentionNotificationView(
  mention: components["schemas"]["CommentReplyView"]
): types.NotificationView {
  const commentView = toPersonMentionView(mention);
  return {
    data: { ...commentView, type_: "comment" } as types.NotificationView["data"],
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

export function toPerson(
  person: components["schemas"]["Person"]
): types.Person {
  return {
    ...person,
    avatar: person.avatar ?? undefined, // TODO piefed types are wrong, this is returned as null if not set
    bot_account: person.bot,
    display_name: person.title ?? undefined, // TODO piefed types are wrong, this is returned as null if not set
    name: person.user_name!,
    published: person.published!,
  };
}

export function toPersonMentionView(
  mention: components["schemas"]["CommentReplyView"]
) {
  return {
    ...mention,
    banned_from_community: false, // TODO isn't being returned rn
    comment: toComment(mention.comment, mention.creator.id),
    community: toCommunity(mention.community),
    creator: toPerson(mention.creator),
    person_mention: mention.comment_reply,
    post: toPost(mention.post),
    recipient: toPerson(mention.recipient),
  };
}

export function toPersonView(personView: components["schemas"]["PersonView"]) {
  return {
    ...personView,
    person: toPerson(personView.person),
  };
}

export function toPost(post: components["schemas"]["Post"]) {
  return {
    ...post,
    creator_id: post.user_id,
    featured_community: post.sticky,
    featured_local: false,
    name: post.title,
  };
}

export function toPostView(
  post: components["schemas"]["PostView"]
): types.PostView {
  return {
    ...post,
    community: toCommunity(post.community),
    creator: toPerson(post.creator),
    creator_blocked: false, // TODO piefed does not return this
    post: toPost(post.post),
  };
}

export function toPrivateMessageNotificationView(
  message: components["schemas"]["PrivateMessageView"]
): types.NotificationView {
  return {
    data: { ...toPrivateMessageView(message), type_: "private_message" } as types.NotificationView["data"],
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
  message: components["schemas"]["PrivateMessageView"]
) {
  return {
    ...message,
    creator: toPerson(message.creator),
    recipient: toPerson(message.recipient),
  };
}

export function toReplyNotificationView(
  reply: components["schemas"]["CommentReplyView"]
): types.NotificationView {
  const commentView = toCommentReplyView(reply);
  return {
    data: { ...commentView, type_: "comment" } as types.NotificationView["data"],
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
    ...site,
    icon: site.icon ?? undefined,
  };
}

function toRegistrationMode(
  mode: components["schemas"]["Site"]["registration_mode"]
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
