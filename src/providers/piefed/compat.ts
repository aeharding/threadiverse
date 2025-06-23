import { components } from "./schema";

export function compatPiefedPerson(person: components["schemas"]["Person"]) {
  return {
    ...person,
    name: person.user_name!,
    display_name: person.title,
    bot_account: person.bot,
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
    name: post.title,
    featured_community: post.sticky,
    featured_local: false,
  };
}

export function compatPiefedPostView(post: components["schemas"]["PostView"]) {
  return {
    ...post,
    community: compatPiefedCommunity(post.community),
    post: compatPiefedPost(post.post),
    creator: compatPiefedPerson(post.creator),
  };
}

export function compatPiefedCommentView(
  comment: components["schemas"]["CommentView"],
) {
  return {
    ...comment,
    community: compatPiefedCommunity(comment.community),
    creator: compatPiefedPerson(comment.creator),
    comment: compatPiefedComment(comment.comment),
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

export function compatPiefedComment(comment: components["schemas"]["Comment"]) {
  return {
    ...comment,
    // @ts-expect-error TODO: fix this
    content: comment.body,
  };
}

export function compatPiefedCommunityView(
  community: components["schemas"]["CommunityView"],
) {
  return {
    ...community,
    community: compatPiefedCommunity(community.community),
    counts: {
      subscribers: community.counts.subscriptions_count,
      posts: community.counts.post_count,
      comments: community.counts.post_reply_count,
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

export function compatPiefedCommunityModeratorView(
  view: components["schemas"]["CommunityModeratorView"],
) {
  return {
    ...view,
    community: compatPiefedCommunity(view.community),
    moderator: compatPiefedPerson(view.moderator),
  };
}
