import type * as LemmyV1 from "lemmy-js-client-v1";

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
  FederatedInstances,
  GetModlogResponse,
  InstanceWithFederationState,
  Notification,
  Person,
  PersonAggregates,
  PersonMentionView,
  PersonView,
  Post,
  PostAggregates,
  PostReportView,
  PostView,
  PrivateMessageView,
  Site,
  SiteView,
  SubscribedType,
} from "../../types";

// TODO Temporary until we support other types
export type LemmyV1PostCommentReportOnly =
  | (LemmyV1.CommentReportView & { type_: "Comment" })
  | (LemmyV1.PostReportView & { type_: "Post" });

export function compatCommunityCounts(
  community: LemmyV1.Community,
): CommunityAggregates {
  return {
    comments: community.comments,
    posts: community.posts,
    subscribers: community.subscribers,
    subscribers_local: community.subscribers_local,
    users_active_day: community.users_active_day,
    users_active_half_year: community.users_active_half_year,
    users_active_month: community.users_active_month,
    users_active_week: community.users_active_week,
  };
}

export function compatLemmyCommentMentionView(
  personMentionView: LemmyV1.PersonCommentMentionView,
): PersonMentionView {
  return {
    ...personMentionView,
    banned_from_community:
      !!personMentionView.community_actions?.ban_expires_at,
    comment: compatComment(personMentionView.comment),
    community: compatCommunity(personMentionView.community),
    counts: compatCommentCounts(personMentionView.comment),
    creator: compatPerson(personMentionView.creator),
    creator_banned_from_community:
      !!personMentionView.community_actions?.ban_expires_at,
    creator_blocked: !!personMentionView.person_actions?.blocked_at,
    person_mention: {
      ...personMentionView.person_comment_mention,
      published: personMentionView.person_comment_mention.published_at,
    },
    post: compatPost(personMentionView.post),
    recipient: compatPerson(personMentionView.recipient),
    saved: !!personMentionView.comment_actions?.saved_at,
    subscribed: compatFollowState(
      personMentionView.community_actions?.follow_state,
    ),
  };
}

export function compatLemmyCommentReplyView(
  commentReply: LemmyV1.CommentReplyView,
): CommentReplyView {
  return {
    ...commentReply,
    banned_from_community: !!commentReply.community_actions?.ban_expires_at,
    comment: compatComment(commentReply.comment),
    comment_reply: {
      ...commentReply.comment_reply,
      published: commentReply.comment_reply.published_at,
    },
    community: compatCommunity(commentReply.community),
    counts: compatCommentCounts(commentReply.comment),
    creator: compatPerson(commentReply.creator),
    creator_blocked: !!commentReply.person_actions?.blocked_at,
    post: compatPost(commentReply.post),
    recipient: compatPerson(commentReply.recipient),
    saved: !!commentReply.comment_actions?.saved_at,
    subscribed: compatFollowState(commentReply.community_actions?.follow_state),
  };
}

export function compatLemmyCommentReportView(
  commentReport: LemmyV1.CommentReportView,
): CommentReportView {
  return {
    ...commentReport,
    comment: compatComment(commentReport.comment),
    comment_creator: compatPerson(commentReport.comment_creator),
    comment_report: {
      ...commentReport.comment_report,
      published: commentReport.comment_report.published_at,
    },
    community: compatCommunity(commentReport.community),
    counts: compatCommentCounts(commentReport.comment),
    creator: compatPerson(commentReport.creator),
    creator_banned_from_community:
      !!commentReport.community_actions?.ban_expires_at,
    creator_blocked: !!commentReport.person_actions?.blocked_at,
    creator_is_moderator: false,
    my_vote: commentReport.comment_actions?.like_score,
    post: compatPost(commentReport.post),
    resolver: commentReport.resolver
      ? compatPerson(commentReport.resolver)
      : undefined,
    saved: !!commentReport.comment_actions?.saved_at,
    subscribed: compatFollowState(
      commentReport.community_actions?.follow_state,
    ),
  };
}

export function compatLemmyCommentView(
  commentView: LemmyV1.CommentView,
): CommentView {
  return {
    ...commentView,
    banned_from_community: !!commentView.community_actions?.ban_expires_at,
    comment: compatComment(commentView.comment),
    community: compatCommunity(commentView.community),
    counts: compatCommentCounts(commentView.comment),
    creator: compatPerson(commentView.creator),
    post: compatPost(commentView.post),
    subscribed: compatFollowState(commentView.community_actions?.follow_state),
    ...compatCommentViewActions(commentView.comment_actions),
  };
}

export function compatLemmyCommunityModeratorView(
  communityModerator: LemmyV1.CommunityModeratorView,
): CommunityModeratorView {
  return {
    ...communityModerator,
    community: compatCommunity(communityModerator.community),
    moderator: compatPerson(communityModerator.moderator),
  };
}

export function compatLemmyCommunityView(
  communityView: LemmyV1.CommunityView,
): CommunityView {
  return {
    ...communityView,
    community: compatCommunity(communityView.community),
    counts: compatCommunityCounts(communityView.community),
    ...compatCommunityViewUserActions(communityView.community_actions),
  };
}

export function compatLemmyFederatedInstances(
  federatedInstances: LemmyV1.FederatedInstances,
): FederatedInstances {
  return {
    ...federatedInstances,
    allowed: federatedInstances.allowed.map(
      compatLemmyInstanceWithFederationState,
    ),
    blocked: federatedInstances.blocked.map(
      compatLemmyInstanceWithFederationState,
    ),
    linked: federatedInstances.linked.map(
      compatLemmyInstanceWithFederationState,
    ),
  };
}

export function compatLemmyInboxCombinedView(
  inboxItem: LemmyV1.InboxCombinedView,
): Notification | undefined {
  switch (inboxItem.type_) {
    case "CommentMention":
      return compatLemmyCommentMentionView(inboxItem);
    case "CommentReply":
      return compatLemmyCommentReplyView(inboxItem);
    case "PrivateMessage":
      return compatLemmyPrivateMessageView(inboxItem);
    default:
      return; // TODO support other inbox items
  }
}

export function compatLemmyModlogView(
  modlog: LemmyV1.ModlogCombinedView,
): GetModlogResponse["modlog"][0] | undefined {
  switch (modlog.type_) {
    case "AdminAllowInstance":
    case "AdminBlockInstance":
    case "ModChangeCommunityVisibility":
      return undefined; // Currently Threadiverse doesn't support these types
    case "AdminPurgeComment":
      return compatLemmyAdminPurgeCommentView(modlog);
    case "AdminPurgeCommunity":
      return compatLemmyAdminPurgeCommunityView(modlog);
    case "AdminPurgePerson":
      return compatLemmyAdminPurgePersonView(modlog);
    case "AdminPurgePost":
      return compatLemmyAdminPurgePostView(modlog);
    case "ModAdd":
      return compatLemmyModAddView(modlog);
    case "ModAddCommunity":
      return compatLemmyModAddCommunityView(modlog);
    case "ModBan":
      return compatLemmyModBanView(modlog);
    case "ModBanFromCommunity":
      return compatLemmyModBanFromCommunityView(modlog);
    case "ModFeaturePost":
      return compatLemmyModFeaturePostView(modlog);
    case "ModLockPost":
      return compatLemmyModLockPostView(modlog);
    case "ModRemoveComment":
      return compatLemmyModRemoveCommentView(modlog);
    case "ModRemoveCommunity":
      return compatLemmyModRemoveCommunityView(modlog);
    case "ModRemovePost":
      return compatLemmyModRemovePostView(modlog);
    case "ModTransferCommunity":
      return compatLemmyModTransferCommunityView(modlog);
  }
}

export function compatLemmyPersonView(
  personView: LemmyV1.PersonView,
): PersonView {
  return {
    ...personView,
    counts: compatPersonCounts(personView.person),
    person: compatPerson(personView.person),
  };
}

export function compatLemmyPostReportView(
  postReport: LemmyV1.PostReportView,
): PostReportView {
  return {
    ...postReport,
    community: compatCommunity(postReport.community),
    counts: compatPostCounts(postReport.post),
    creator: compatPerson(postReport.creator),
    creator_banned_from_community:
      !!postReport.community_actions?.ban_expires_at,
    creator_blocked: !!postReport.person_actions?.blocked_at,
    creator_is_moderator: false,
    hidden: !!postReport.post_actions?.hidden_at,
    post: compatPost(postReport.post),
    post_creator: compatPerson(postReport.post_creator),
    post_report: {
      ...postReport.post_report,
      published: postReport.post_report.published_at,
    },
    read: !!postReport.post_actions?.read_at,
    resolver: postReport.resolver
      ? compatPerson(postReport.resolver)
      : undefined,
    saved: !!postReport.post_actions?.saved_at,
    subscribed: compatFollowState(postReport.community_actions?.follow_state),
    unread_comments: postReport.post_actions?.read_comments_at
      ? postReport.post.comments -
        (postReport.post_actions.read_comments_amount ?? 0)
      : 0,
  };
}

export function compatLemmyPostView(postView: LemmyV1.PostView): PostView {
  return {
    ...postView,
    banned_from_community: !!postView.community_actions?.ban_expires_at,
    community: compatCommunity(postView.community),
    counts: compatPostCounts(postView.post),
    creator: compatPerson(postView.creator),
    creator_blocked: !!postView.person_actions?.blocked_at,
    post: compatPost(postView.post),
    ...compatPostViewUserActions(postView.post_actions, postView.post.comments),
    ...compatCommunityViewUserActions(postView.community_actions),
  };
}

export function compatLemmyPrivateMessageView(
  privateMessage: LemmyV1.PrivateMessageView,
): PrivateMessageView {
  return {
    ...privateMessage,
    creator: compatPerson(privateMessage.creator),
    private_message: {
      ...privateMessage.private_message,
      published: privateMessage.private_message.published_at,
    },
    recipient: compatPerson(privateMessage.recipient),
  };
}

export function compatLemmyReportView(
  report: LemmyV1PostCommentReportOnly,
): CommentReportView | PostReportView {
  switch (report.type_) {
    case "Comment":
      return compatLemmyCommentReportView(report);
    case "Post":
      return compatLemmyPostReportView(report);
  }
}

export function compatLemmySiteView(siteView: LemmyV1.SiteView): SiteView {
  return {
    ...siteView,
    site: compatSite(siteView.site),
  };
}

function compatComment(comment: LemmyV1.Comment): Comment {
  return {
    ...comment,
    published: comment.published_at,
  };
}

function compatCommentCounts(comment: LemmyV1.Comment): CommentAggregates {
  return {
    child_count: comment.child_count,
    comment_id: comment.id,
    downvotes: comment.downvotes,
    published: comment.published_at,
    score: comment.score,
    upvotes: comment.upvotes,
  };
}

function compatCommentViewActions(
  commentActions: LemmyV1.CommentActions | undefined,
): Pick<CommentView, "my_vote" | "saved"> {
  return {
    my_vote: commentActions?.like_score,
    saved: !!commentActions?.saved_at,
  };
}

function compatCommunity(community: LemmyV1.Community): Community {
  return {
    ...community,
    actor_id: community.ap_id,
    hidden: false, // TODO what does this mean, v0 vs v1?
    published: community.published_at,
  };
}

function compatCommunityViewUserActions(
  userActions: LemmyV1.CommunityActions | undefined,
): Pick<CommunityView, "blocked" | "subscribed"> {
  return {
    blocked: !!userActions?.blocked_at,
    subscribed: compatFollowState(userActions?.follow_state),
  };
}

function compatFollowState(
  followState: LemmyV1.CommunityFollowerState | undefined,
): SubscribedType {
  switch (followState) {
    case "Accepted":
      return "Subscribed";
    case "ApprovalRequired":
    case "Pending":
      return followState;
    case undefined:
      return "NotSubscribed";
  }
}

function compatLemmyAdminPurgeCommentView(
  adminPurgeComment: LemmyV1.AdminPurgeCommentView,
): GetModlogResponse["modlog"][0] {
  return {
    ...adminPurgeComment,
    admin: adminPurgeComment.admin
      ? compatPerson(adminPurgeComment.admin)
      : undefined,
    admin_purge_comment: {
      ...adminPurgeComment.admin_purge_comment,
      when_: adminPurgeComment.admin_purge_comment.published_at,
    },
    post: compatPost(adminPurgeComment.post),
  };
}

function compatLemmyAdminPurgeCommunityView(
  adminPurgeCommunity: LemmyV1.AdminPurgeCommunityView,
): GetModlogResponse["modlog"][0] {
  return {
    ...adminPurgeCommunity,
    admin: adminPurgeCommunity.admin
      ? compatPerson(adminPurgeCommunity.admin)
      : undefined,
    admin_purge_community: {
      ...adminPurgeCommunity.admin_purge_community,
      when_: adminPurgeCommunity.admin_purge_community.published_at,
    },
  };
}

function compatLemmyAdminPurgePersonView(
  adminPurgePerson: LemmyV1.AdminPurgePersonView,
): GetModlogResponse["modlog"][0] {
  return {
    ...adminPurgePerson,
    admin: adminPurgePerson.admin
      ? compatPerson(adminPurgePerson.admin)
      : undefined,
    admin_purge_person: {
      ...adminPurgePerson.admin_purge_person,
      when_: adminPurgePerson.admin_purge_person.published_at,
    },
  };
}

function compatLemmyAdminPurgePostView(
  adminPurgePost: LemmyV1.AdminPurgePostView,
): GetModlogResponse["modlog"][0] {
  return {
    ...adminPurgePost,
    admin: adminPurgePost.admin
      ? compatPerson(adminPurgePost.admin)
      : undefined,
    admin_purge_post: {
      ...adminPurgePost.admin_purge_post,
      when_: adminPurgePost.admin_purge_post.published_at,
    },
    community: compatCommunity(adminPurgePost.community),
  };
}

function compatLemmyInstanceWithFederationState(
  instance: LemmyV1.InstanceWithFederationState,
): InstanceWithFederationState {
  return {
    ...instance,
    published: instance.published_at,
  };
}

function compatLemmyModAddCommunityView(
  modAddCommunity: LemmyV1.ModAddCommunityView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modAddCommunity,
    community: compatCommunity(modAddCommunity.community),
    mod_add_community: {
      ...modAddCommunity.mod_add_community,
      when_: modAddCommunity.mod_add_community.published_at,
    },
    modded_person: compatPerson(modAddCommunity.other_person),
    moderator: modAddCommunity.moderator
      ? compatPerson(modAddCommunity.moderator)
      : undefined,
  };
}

function compatLemmyModAddView(
  modAdd: LemmyV1.ModAddView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modAdd,
    mod_add: {
      ...modAdd.mod_add,
      when_: modAdd.mod_add.published_at,
    },
    modded_person: compatPerson(modAdd.other_person),
    moderator: modAdd.moderator ? compatPerson(modAdd.moderator) : undefined,
  };
}

function compatLemmyModBanFromCommunityView(
  modBanFromCommunity: LemmyV1.ModBanFromCommunityView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modBanFromCommunity,
    banned_person: compatPerson(modBanFromCommunity.other_person),
    community: compatCommunity(modBanFromCommunity.community),
    mod_ban_from_community: {
      ...modBanFromCommunity.mod_ban_from_community,
      when_: modBanFromCommunity.mod_ban_from_community.published_at,
    },
    moderator: modBanFromCommunity.moderator
      ? compatPerson(modBanFromCommunity.moderator)
      : undefined,
  };
}

function compatLemmyModBanView(
  modBan: LemmyV1.ModBanView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modBan,
    banned_person: compatPerson(modBan.other_person),
    mod_ban: {
      ...modBan.mod_ban,
      when_: modBan.mod_ban.published_at,
    },
    moderator: modBan.moderator ? compatPerson(modBan.moderator) : undefined,
  };
}

function compatLemmyModFeaturePostView(
  modFeaturePost: LemmyV1.ModFeaturePostView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modFeaturePost,
    community: compatCommunity(modFeaturePost.community),
    mod_feature_post: {
      ...modFeaturePost.mod_feature_post,
      when_: modFeaturePost.mod_feature_post.published_at,
    },
    moderator: modFeaturePost.moderator
      ? compatPerson(modFeaturePost.moderator)
      : undefined,
    post: compatPost(modFeaturePost.post),
  };
}

function compatLemmyModLockPostView(
  modLockPost: LemmyV1.ModLockPostView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modLockPost,
    community: compatCommunity(modLockPost.community),
    mod_lock_post: {
      ...modLockPost.mod_lock_post,
      when_: modLockPost.mod_lock_post.published_at,
    },
    moderator: modLockPost.moderator
      ? compatPerson(modLockPost.moderator)
      : undefined,
    post: compatPost(modLockPost.post),
  };
}

function compatLemmyModRemoveCommentView(
  modRemoveComment: LemmyV1.ModRemoveCommentView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modRemoveComment,
    comment: compatComment(modRemoveComment.comment),
    commenter: compatPerson(modRemoveComment.other_person),
    community: compatCommunity(modRemoveComment.community),
    mod_remove_comment: {
      ...modRemoveComment.mod_remove_comment,
      when_: modRemoveComment.mod_remove_comment.published_at,
    },
    moderator: modRemoveComment.moderator
      ? compatPerson(modRemoveComment.moderator)
      : undefined,
    post: compatPost(modRemoveComment.post),
  };
}

function compatLemmyModRemoveCommunityView(
  modRemoveCommunity: LemmyV1.ModRemoveCommunityView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modRemoveCommunity,
    community: compatCommunity(modRemoveCommunity.community),
    mod_remove_community: {
      ...modRemoveCommunity.mod_remove_community,
      when_: modRemoveCommunity.mod_remove_community.published_at,
    },
    moderator: modRemoveCommunity.moderator
      ? compatPerson(modRemoveCommunity.moderator)
      : undefined,
  };
}

function compatLemmyModRemovePostView(
  modRemovePost: LemmyV1.ModRemovePostView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modRemovePost,
    community: compatCommunity(modRemovePost.community),
    mod_remove_post: {
      ...modRemovePost.mod_remove_post,
      when_: modRemovePost.mod_remove_post.published_at,
    },
    moderator: modRemovePost.moderator
      ? compatPerson(modRemovePost.moderator)
      : undefined,
    post: compatPost(modRemovePost.post),
  };
}

function compatLemmyModTransferCommunityView(
  modTransferCommunity: LemmyV1.ModTransferCommunityView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modTransferCommunity,
    community: compatCommunity(modTransferCommunity.community),
    mod_transfer_community: {
      ...modTransferCommunity.mod_transfer_community,
      when_: modTransferCommunity.mod_transfer_community.published_at,
    },
    modded_person: compatPerson(modTransferCommunity.other_person),
    moderator: modTransferCommunity.moderator
      ? compatPerson(modTransferCommunity.moderator)
      : undefined,
  };
}

function compatPerson(person: LemmyV1.Person): Person {
  return {
    ...person,
    actor_id: person.ap_id,
    published: person.published_at,
  };
}

function compatPersonCounts(person: LemmyV1.Person): PersonAggregates {
  return {
    comment_count: person.comment_count,
    post_count: person.post_count,
  };
}

function compatPost(post: LemmyV1.Post): Post {
  return {
    ...post,
    published: post.published_at,
  };
}

function compatPostCounts(post: LemmyV1.Post): PostAggregates {
  return {
    comments: post.comments,
    downvotes: post.downvotes,
    newest_comment_time: post.newest_comment_time_at,
    published: post.published_at,
    score: post.score,
    upvotes: post.upvotes,
  };
}

function compatPostViewUserActions(
  postActions: LemmyV1.PostActions | undefined,
  totalComments: number,
): Pick<PostView, "hidden" | "read" | "saved" | "unread_comments"> {
  return {
    hidden: !!postActions?.hidden_at,
    read: !!postActions?.read_at,
    saved: !!postActions?.saved_at,
    unread_comments: postActions?.read_comments_at
      ? totalComments - (postActions.read_comments_amount ?? 0)
      : 0,
  };
}

function compatSite(site: LemmyV1.Site): Site {
  return {
    ...site,
    actor_id: site.ap_id,
  };
}
