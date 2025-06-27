import * as types from "../../types";
import {
  compatLemmyPageParams,
  compatLemmyPageResponse,
} from "../lemmyv0/compat";
import { components } from "./schema";

export const compatPiefedPageResponse = compatLemmyPageResponse;
export const compatPiefedPageParams = compatLemmyPageParams;

export function compatPiefedComment(
  comment: components["schemas"]["Comment"],
  creator_id: number, // TODO piefed types are wrong, this isn't being returned rn
) {
  return {
    ...comment,
    content: comment.body,
    creator_id,
    distinguished: comment.distinguished ?? false,
  };
}

export function compatPiefedCommentReplyView(
  reply: components["schemas"]["CommentReplyView"],
) {
  return {
    ...reply,
    banned_from_community: reply.banned_from_community ?? false, // TODO piefed types are wrong, this isn't being returned rn
    comment: compatPiefedComment(reply.comment, reply.creator.id),
    community: compatPiefedCommunity(reply.community),
    creator: compatPiefedPerson(reply.creator),
    post: compatPiefedPost(reply.post),
    recipient: compatPiefedPerson(reply.recipient),
  };
}

export function compatPiefedCommentView(
  comment: components["schemas"]["CommentView"],
) {
  return {
    ...comment,
    comment: compatPiefedComment(comment.comment, comment.creator.id),
    community: compatPiefedCommunity(comment.community),
    creator: compatPiefedPerson(comment.creator),
    post: compatPiefedPost(comment.post),
  };
}

export function compatPiefedCommunity(
  community: components["schemas"]["Community"],
) {
  return {
    ...community,
    posting_restricted_to_mods: community.restricted_to_mods,
    visibility: "Public" as const,
  };
}

export function compatPiefedCommunityModeratorView(
  view: components["schemas"]["CommunityModeratorView"],
) {
  return {
    ...view,
    community: compatPiefedCommunity(view.community),
    moderator: compatPiefedPerson(view.moderator),
  };
}

export function compatPiefedCommunityView(
  community: components["schemas"]["CommunityView"],
) {
  return {
    ...community,
    community: compatPiefedCommunity(community.community),
    counts: {
      comments: community.counts.post_reply_count,
      posts: community.counts.post_count,
      subscribers: community.counts.subscriptions_count,
    },
  };
}

export function compatPiefedGetCommunityResponse(
  response: components["schemas"]["GetCommunityResponse"],
) {
  return {
    community_view: compatPiefedCommunityView(response.community_view),
    moderators: response.moderators.map(compatPiefedCommunityModeratorView),
  };
}

export function compatPiefedLocalSite(
  site: components["schemas"]["Site"],
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

export function compatPiefedPerson(person: components["schemas"]["Person"]) {
  return {
    ...person,
    avatar: person.avatar ?? undefined, // TODO piefed types are wrong, this is returned as null if not set
    bot_account: person.bot,
    display_name: person.title ?? undefined, // TODO piefed types are wrong, this is returned as null if not set
    name: person.user_name!,
  };
}

export function compatPiefedPersonView(
  personView: components["schemas"]["PersonView"],
) {
  return {
    ...personView,
    person: compatPiefedPerson(personView.person),
  };
}

export function compatPiefedPost(post: components["schemas"]["Post"]) {
  return {
    ...post,
    creator_id: post.user_id,
    featured_community: post.sticky,
    featured_local: false,
    name: post.title,
  };
}

export function compatPiefedPostView(
  post: components["schemas"]["PostView"],
): types.PostView {
  return {
    ...post,
    community: compatPiefedCommunity(post.community),
    creator: compatPiefedPerson(post.creator),
    creator_blocked: false, // TODO piefed does not return this
    post: compatPiefedPost(post.post),
  };
}

export function compatPiefedPrivateMessageView(
  message: components["schemas"]["PrivateMessageView"],
) {
  return {
    ...message,
    creator: compatPiefedPerson(message.creator),
    recipient: compatPiefedPerson(message.recipient),
  };
}
