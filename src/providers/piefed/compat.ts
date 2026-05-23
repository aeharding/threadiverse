import * as types from "../../types";
import * as lemmyCompat from "../lemmyv0/compat";
import { components } from "./schema";

export const toPageResponse = lemmyCompat.toPageResponse;
export const fromPageParams = lemmyCompat.fromPageParams;
export const fromSearchType = lemmyCompat.fromSearchType;

type PiefedComment = components["schemas"]["Comment"];
type PiefedCommentAggregates = components["schemas"]["CommentAggregates"];
type PiefedCommunity = components["schemas"]["Community"];
type PiefedCommunityAggregates = components["schemas"]["CommunityAggregates"];
type PiefedInstance = components["schemas"]["Instance"];
type PiefedPerson = components["schemas"]["Person"];
type PiefedPersonAggregates = components["schemas"]["PersonAggregates"];
type PiefedPost = components["schemas"]["Post"];
type PiefedPostAggregates = components["schemas"]["PostAggregates"];
type PiefedPrivateMessage = components["schemas"]["PrivateMessage"];

export function fromListingType(
  listingType: types.ListingType | undefined,
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
  return {
    captcha_enabled: false,
    comment_downvotes: "all",
    comment_upvotes: "all",
    comments: 0,
    communities: 0,
    email_verification_required: false,
    legal_information: undefined,
    post_downvotes: "all",
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
    post: toPost(v.post, v.counts),
    read: v.read,
    saved: v.saved,
    subscribed: toSubscribedType(v.subscribed),
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
