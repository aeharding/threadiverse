import {
  CommunityActions,
  CommunityFollowerState,
  CommunityModeratorView as LemmyV1CommunityModeratorView,
  CommentReplyView as LemmyV1CommentReplyView,
  CommentReportView as LemmyV1CommentReportView,
  CommentView as LemmyV1CommentView,
  CommunityView as LemmyV1CommunityView,
  PersonMentionView as LemmyV1PersonMentionView,
  Community as LemmyV1Community,
  PostReportView as LemmyV1PostReportView,
  PostView as LemmyV1PostView,
  Post as LemmyV1Post,
  SiteView as LemmyV1SiteView,
  PostActions,
  Person as LemmyV1Person,
  PersonView as LemmyV1PersonView,
  Site as LemmyV1Site,
  Comment as LemmyV1Comment,
  CommentActions,
} from "lemmy-js-client-v1";
import {
  Comment,
  CommentAggregates,
  CommentReplyView,
  CommentReportView,
  CommentView,
  Community,
  CommunityAggregates,
  CommunityModeratorView,
  CommunityView,
  Person,
  PersonAggregates,
  PersonMentionView,
  PersonView,
  Post,
  PostAggregates,
  PostReportView,
  PostView,
  Site,
  SiteView,
  SubscribedType,
} from "../../types";

export function compatLemmyCommunityView(
  communityView: LemmyV1CommunityView,
): CommunityView {
  return {
    ...communityView,
    community: compatCommunity(communityView.community),
    counts: compatCommunityCounts(communityView.community),
    ...compatCommunityViewUserActions(communityView.community_actions),
  };
}

function compatCommunity(community: LemmyV1Community): Community {
  return {
    ...community,
    published: community.published_at,
    actor_id: community.ap_id,
    hidden: false, // TODO what does this mean, v0 vs v1?
  };
}

export function compatCommunityCounts(
  community: LemmyV1Community,
): CommunityAggregates {
  return {
    subscribers: community.subscribers,
    posts: community.posts,
    comments: community.comments,
    users_active_day: community.users_active_day,
    users_active_week: community.users_active_week,
    users_active_month: community.users_active_month,
    users_active_half_year: community.users_active_half_year,
    subscribers_local: community.subscribers_local,
  };
}

export function compatLemmyPostView(postView: LemmyV1PostView): PostView {
  return {
    ...postView,
    creator: compatPerson(postView.creator),
    post: compatPost(postView.post),
    counts: compatPostCounts(postView.post),
    community: compatCommunity(postView.community),
    banned_from_community: !!postView.community_actions?.ban_expires_at,
    creator_blocked: !!postView.person_actions?.blocked_at,
    ...compatPostViewUserActions(postView.post_actions, postView.post.comments),
    ...compatCommunityViewUserActions(postView.community_actions),
  };
}

function compatPostViewUserActions(
  postActions: PostActions | undefined,
  totalComments: number,
): Pick<PostView, "saved" | "read" | "unread_comments" | "hidden"> {
  return {
    saved: !!postActions?.saved_at,
    read: !!postActions?.read_at,
    unread_comments: postActions?.read_comments_at
      ? totalComments - (postActions.read_comments_amount ?? 0)
      : 0,
    hidden: !!postActions?.hidden_at,
  };
}

function compatPost(post: LemmyV1Post): Post {
  return {
    ...post,
    published: post.published_at,
  };
}

function compatPostCounts(post: LemmyV1Post): PostAggregates {
  return {
    comments: post.comments,
    score: post.score,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    newest_comment_time: post.newest_comment_time_at,
    published: post.published_at,
  };
}

export function compatLemmyPersonView(
  personView: LemmyV1PersonView,
): PersonView {
  return {
    ...personView,
    person: compatPerson(personView.person),
    counts: compatPersonCounts(personView.person),
  };
}

function compatPersonCounts(person: LemmyV1Person): PersonAggregates {
  return {
    comment_count: person.comment_count,
    post_count: person.post_count,
  };
}

function compatPerson(person: LemmyV1Person): Person {
  return {
    ...person,
    published: person.published_at,
    actor_id: person.ap_id,
  };
}

export function compatLemmyCommentView(
  commentView: LemmyV1CommentView,
): CommentView {
  return {
    ...commentView,
    counts: compatCommentCounts(commentView.comment),
    creator: compatPerson(commentView.creator),
    comment: compatComment(commentView.comment),
    banned_from_community: !!commentView.community_actions?.ban_expires_at,
    subscribed: compatFollowState(commentView.community_actions?.follow_state),
    community: compatCommunity(commentView.community),
    post: compatPost(commentView.post),
    ...compatCommentViewActions(commentView.comment_actions),
  };
}

function compatCommentViewActions(
  commentActions: CommentActions | undefined,
): Pick<CommentView, "saved" | "my_vote"> {
  return {
    saved: !!commentActions?.saved_at,
    my_vote: commentActions?.like_score,
  };
}

function compatComment(comment: LemmyV1Comment): Comment {
  return {
    ...comment,
    published: comment.published_at,
  };
}

function compatCommentCounts(comment: LemmyV1Comment): CommentAggregates {
  return {
    comment_id: comment.id,
    score: comment.score,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    child_count: comment.child_count,
    published: comment.published_at,
  };
}

export function compatLemmyMentionView(
  personMention: LemmyV1PersonMentionView,
): PersonMentionView {
  return personMention;
}

export function compatLemmyReplyView(
  personMention: LemmyV1CommentReplyView,
): CommentReplyView {
  return personMention;
}

export function compatLemmyCommentReportView(
  commentReport: LemmyV1CommentReportView,
): CommentReportView {
  return commentReport;
}

export function compatLemmyPostReportView(
  postReport: LemmyV1PostReportView,
): PostReportView {
  return postReport;
}

function compatCommunityViewUserActions(
  userActions: CommunityActions | undefined,
): Pick<CommunityView, "blocked" | "subscribed"> {
  return {
    blocked: !!userActions?.blocked_at,
    subscribed: compatFollowState(userActions?.follow_state),
  };
}

function compatFollowState(
  followState: CommunityFollowerState | undefined,
): SubscribedType {
  switch (followState) {
    case undefined:
      return "NotSubscribed";
    case "ApprovalRequired":
    case "Pending":
      return followState;
    case "Accepted":
      return "Subscribed";
  }
}

export function compatLemmySiteView(siteView: LemmyV1SiteView): SiteView {
  return {
    ...siteView,
    site: compatSite(siteView.site),
  };
}

function compatSite(site: LemmyV1Site): Site {
  return {
    ...site,
    actor_id: site.ap_id,
  };
}

export function compatLemmyCommunityModeratorView(
  communityModerator: LemmyV1CommunityModeratorView,
): CommunityModeratorView {
  return {
    ...communityModerator,
    moderator: compatPerson(communityModerator.moderator),
    community: compatCommunity(communityModerator.community),
  };
}
