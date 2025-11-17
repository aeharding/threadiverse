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
    visibility: "Public" as const,
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

export function toLocalSite(
  site: components["schemas"]["Site"]
): types.LocalSite {
  return {
    captcha_enabled: false,
    comment_downvotes: "All",
    comment_upvotes: "All",
    post_downvotes: "All",
    post_upvotes: "All",
    registration_mode: site.registration_mode!,
    require_email_verification: false,
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
): types.PersonMentionView {
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

export function toPrivateMessageView(
  message: components["schemas"]["PrivateMessageView"]
) {
  return {
    ...message,
    creator: toPerson(message.creator),
    recipient: toPerson(message.recipient),
  };
}

export function toSite(site: components["schemas"]["Site"]): types.Site {
  return {
    ...site,
    icon: site.icon ?? undefined,
  };
}
