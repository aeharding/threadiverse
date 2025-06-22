import {
  CommunityActions as LemmyV1CommunityActions,
  CommunityFollowerState as LemmyV1CommunityFollowerState,
  CommunityModeratorView as LemmyV1CommunityModeratorView,
  CommentReplyView as LemmyV1CommentReplyView,
  CommentReportView as LemmyV1CommentReportView,
  CommentView as LemmyV1CommentView,
  CommunityView as LemmyV1CommunityView,
  PersonCommentMentionView as LemmyV1PersonCommentMentionView,
  Community as LemmyV1Community,
  PostReportView as LemmyV1PostReportView,
  PostView as LemmyV1PostView,
  Post as LemmyV1Post,
  SiteView as LemmyV1SiteView,
  PostActions as LemmyV1PostActions,
  Person as LemmyV1Person,
  PersonView as LemmyV1PersonView,
  Site as LemmyV1Site,
  Comment as LemmyV1Comment,
  CommentActions as LemmyV1CommentActions,
  InboxCombinedView as LemmyV1InboxCombinedView,
  PrivateMessageView as LemmyV1PrivateMessageView,
  ModlogCombinedView as LemmyV1ModlogCombinedView,
  AdminPurgeCommentView as LemmyV1AdminPurgeCommentView,
  ModLockPostView as LemmyV1ModLockPostView,
  AdminPurgeCommunityView as LemmyV1AdminPurgeCommunityView,
  AdminPurgePersonView as LemmyV1AdminPurgePersonView,
  AdminPurgePostView as LemmyV1AdminPurgePostView,
  ModAddView as LemmyV1ModAddView,
  ModAddCommunityView as LemmyV1ModAddCommunityView,
  ModBanView as LemmyV1ModBanView,
  ModBanFromCommunityView as LemmyV1ModBanFromCommunityView,
  ModFeaturePostView as LemmyV1ModFeaturePostView,
  ModRemoveCommentView as LemmyV1ModRemoveCommentView,
  ModRemoveCommunityView as LemmyV1ModRemoveCommunityView,
  ModRemovePostView as LemmyV1ModRemovePostView,
  ModTransferCommunityView as LemmyV1ModTransferCommunityView,
  FederatedInstances as LemmyV1FederatedInstances,
  InstanceWithFederationState as LemmyV1InstanceWithFederationState,
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
  PrivateMessageView,
  Site,
  SiteView,
  SubscribedType,
  GetModlogResponse,
  FederatedInstances,
  InstanceWithFederationState,
} from "../../types";
import { Notification } from "../../types/Notification";

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
  postActions: LemmyV1PostActions | undefined,
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
  commentActions: LemmyV1CommentActions | undefined,
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

export function compatLemmyCommentMentionView(
  personMentionView: LemmyV1PersonCommentMentionView,
): PersonMentionView {
  return {
    ...personMentionView,
    person_mention: {
      ...personMentionView.person_comment_mention,
      published: personMentionView.person_comment_mention.published_at,
    },
    comment: compatComment(personMentionView.comment),
    post: compatPost(personMentionView.post),
    community: compatCommunity(personMentionView.community),
    creator: compatPerson(personMentionView.creator),
    recipient: compatPerson(personMentionView.recipient),
    counts: compatCommentCounts(personMentionView.comment),
    creator_banned_from_community:
      !!personMentionView.community_actions?.ban_expires_at,
    banned_from_community:
      !!personMentionView.community_actions?.ban_expires_at,
    subscribed: compatFollowState(
      personMentionView.community_actions?.follow_state,
    ),
    saved: !!personMentionView.comment_actions?.saved_at,
    creator_blocked: !!personMentionView.person_actions?.blocked_at,
  };
}

export function compatLemmyCommentReplyView(
  commentReply: LemmyV1CommentReplyView,
): CommentReplyView {
  return {
    ...commentReply,
    comment_reply: {
      ...commentReply.comment_reply,
      published: commentReply.comment_reply.published_at,
    },
    comment: compatComment(commentReply.comment),
    post: compatPost(commentReply.post),
    community: compatCommunity(commentReply.community),
    creator: compatPerson(commentReply.creator),
    recipient: compatPerson(commentReply.recipient),
    counts: compatCommentCounts(commentReply.comment),
    banned_from_community: !!commentReply.community_actions?.ban_expires_at,
    subscribed: compatFollowState(commentReply.community_actions?.follow_state),
    saved: !!commentReply.comment_actions?.saved_at,
    creator_blocked: !!commentReply.person_actions?.blocked_at,
  };
}

export function compatLemmyCommentReportView(
  commentReport: LemmyV1CommentReportView,
): CommentReportView {
  return {
    ...commentReport,
    comment_report: {
      ...commentReport.comment_report,
      published: commentReport.comment_report.published_at,
    },
    post: compatPost(commentReport.post),
    comment_creator: compatPerson(commentReport.comment_creator),
    resolver: commentReport.resolver
      ? compatPerson(commentReport.resolver)
      : undefined,
    comment: compatComment(commentReport.comment),
    community: compatCommunity(commentReport.community),
    creator: compatPerson(commentReport.creator),
    counts: compatCommentCounts(commentReport.comment),
    creator_banned_from_community:
      !!commentReport.community_actions?.ban_expires_at,
    creator_blocked: !!commentReport.person_actions?.blocked_at,
    creator_is_moderator: false,
    subscribed: compatFollowState(
      commentReport.community_actions?.follow_state,
    ),
    saved: !!commentReport.comment_actions?.saved_at,
    my_vote: commentReport.comment_actions?.like_score,
  };
}

export function compatLemmyPostReportView(
  postReport: LemmyV1PostReportView,
): PostReportView {
  return {
    ...postReport,
    post_report: {
      ...postReport.post_report,
      published: postReport.post_report.published_at,
    },
    post_creator: compatPerson(postReport.post_creator),
    resolver: postReport.resolver
      ? compatPerson(postReport.resolver)
      : undefined,
    post: compatPost(postReport.post),
    community: compatCommunity(postReport.community),
    creator: compatPerson(postReport.creator),
    counts: compatPostCounts(postReport.post),
    creator_banned_from_community:
      !!postReport.community_actions?.ban_expires_at,
    creator_blocked: !!postReport.person_actions?.blocked_at,
    creator_is_moderator: false,
    subscribed: compatFollowState(postReport.community_actions?.follow_state),
    saved: !!postReport.post_actions?.saved_at,
    read: !!postReport.post_actions?.read_at,
    unread_comments: postReport.post_actions?.read_comments_at
      ? postReport.post.comments -
        (postReport.post_actions.read_comments_amount ?? 0)
      : 0,
    hidden: !!postReport.post_actions?.hidden_at,
  };
}

function compatCommunityViewUserActions(
  userActions: LemmyV1CommunityActions | undefined,
): Pick<CommunityView, "blocked" | "subscribed"> {
  return {
    blocked: !!userActions?.blocked_at,
    subscribed: compatFollowState(userActions?.follow_state),
  };
}

function compatFollowState(
  followState: LemmyV1CommunityFollowerState | undefined,
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

export function compatLemmyInboxCombinedView(
  inboxItem: LemmyV1InboxCombinedView,
): Notification | undefined {
  switch (inboxItem.type_) {
    case "CommentReply":
      return compatLemmyCommentReplyView(inboxItem);
    case "CommentMention":
      return compatLemmyCommentMentionView(inboxItem);
    case "PrivateMessage":
      return compatLemmyPrivateMessageView(inboxItem);
    default:
      return; // TODO support other inbox items
  }
}

export function compatLemmyPrivateMessageView(
  privateMessage: LemmyV1PrivateMessageView,
): PrivateMessageView {
  return {
    ...privateMessage,
    private_message: {
      ...privateMessage.private_message,
      published: privateMessage.private_message.published_at,
    },
    creator: compatPerson(privateMessage.creator),
    recipient: compatPerson(privateMessage.recipient),
  };
}

// TODO Temporary until we support other types
export type LemmyV1PostCommentReportOnly =
  | ({ type_: "Post" } & LemmyV1PostReportView)
  | ({ type_: "Comment" } & LemmyV1CommentReportView);

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

export function compatLemmyModlogView(
  modlog: LemmyV1ModlogCombinedView,
): GetModlogResponse["modlog"][0] | undefined {
  switch (modlog.type_) {
    case "AdminPurgeComment":
      return compatLemmyAdminPurgeCommentView(modlog);
    case "ModLockPost":
      return compatLemmyModLockPostView(modlog);
    case "AdminAllowInstance":
    case "AdminBlockInstance":
    case "ModChangeCommunityVisibility":
      return undefined; // Currently Threadiverse doesn't support these types
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

function compatLemmyAdminPurgeCommentView(
  adminPurgeComment: LemmyV1AdminPurgeCommentView,
): GetModlogResponse["modlog"][0] {
  return {
    ...adminPurgeComment,
    admin_purge_comment: {
      ...adminPurgeComment.admin_purge_comment,
      when_: adminPurgeComment.admin_purge_comment.published_at,
    },
    post: compatPost(adminPurgeComment.post),
    admin: adminPurgeComment.admin
      ? compatPerson(adminPurgeComment.admin)
      : undefined,
  };
}

function compatLemmyModLockPostView(
  modLockPost: LemmyV1ModLockPostView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modLockPost,
    mod_lock_post: {
      ...modLockPost.mod_lock_post,
      when_: modLockPost.mod_lock_post.published_at,
    },
    post: compatPost(modLockPost.post),
    moderator: modLockPost.moderator
      ? compatPerson(modLockPost.moderator)
      : undefined,
    community: compatCommunity(modLockPost.community),
  };
}

function compatLemmyAdminPurgeCommunityView(
  adminPurgeCommunity: LemmyV1AdminPurgeCommunityView,
): GetModlogResponse["modlog"][0] {
  return {
    ...adminPurgeCommunity,
    admin_purge_community: {
      ...adminPurgeCommunity.admin_purge_community,
      when_: adminPurgeCommunity.admin_purge_community.published_at,
    },
    admin: adminPurgeCommunity.admin
      ? compatPerson(adminPurgeCommunity.admin)
      : undefined,
  };
}

function compatLemmyAdminPurgePersonView(
  adminPurgePerson: LemmyV1AdminPurgePersonView,
): GetModlogResponse["modlog"][0] {
  return {
    ...adminPurgePerson,
    admin_purge_person: {
      ...adminPurgePerson.admin_purge_person,
      when_: adminPurgePerson.admin_purge_person.published_at,
    },
    admin: adminPurgePerson.admin
      ? compatPerson(adminPurgePerson.admin)
      : undefined,
  };
}

function compatLemmyAdminPurgePostView(
  adminPurgePost: LemmyV1AdminPurgePostView,
): GetModlogResponse["modlog"][0] {
  return {
    ...adminPurgePost,
    admin_purge_post: {
      ...adminPurgePost.admin_purge_post,
      when_: adminPurgePost.admin_purge_post.published_at,
    },
    admin: adminPurgePost.admin
      ? compatPerson(adminPurgePost.admin)
      : undefined,
    community: compatCommunity(adminPurgePost.community),
  };
}

function compatLemmyModAddView(
  modAdd: LemmyV1ModAddView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modAdd,
    mod_add: {
      ...modAdd.mod_add,
      when_: modAdd.mod_add.published_at,
    },
    moderator: modAdd.moderator ? compatPerson(modAdd.moderator) : undefined,
    modded_person: compatPerson(modAdd.other_person),
  };
}

function compatLemmyModAddCommunityView(
  modAddCommunity: LemmyV1ModAddCommunityView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modAddCommunity,
    mod_add_community: {
      ...modAddCommunity.mod_add_community,
      when_: modAddCommunity.mod_add_community.published_at,
    },
    moderator: modAddCommunity.moderator
      ? compatPerson(modAddCommunity.moderator)
      : undefined,
    community: compatCommunity(modAddCommunity.community),
    modded_person: compatPerson(modAddCommunity.other_person),
  };
}

function compatLemmyModBanView(
  modBan: LemmyV1ModBanView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modBan,
    mod_ban: {
      ...modBan.mod_ban,
      when_: modBan.mod_ban.published_at,
    },
    moderator: modBan.moderator ? compatPerson(modBan.moderator) : undefined,
    banned_person: compatPerson(modBan.other_person),
  };
}

function compatLemmyModBanFromCommunityView(
  modBanFromCommunity: LemmyV1ModBanFromCommunityView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modBanFromCommunity,
    mod_ban_from_community: {
      ...modBanFromCommunity.mod_ban_from_community,
      when_: modBanFromCommunity.mod_ban_from_community.published_at,
    },
    moderator: modBanFromCommunity.moderator
      ? compatPerson(modBanFromCommunity.moderator)
      : undefined,
    community: compatCommunity(modBanFromCommunity.community),
    banned_person: compatPerson(modBanFromCommunity.other_person),
  };
}

function compatLemmyModFeaturePostView(
  modFeaturePost: LemmyV1ModFeaturePostView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modFeaturePost,
    mod_feature_post: {
      ...modFeaturePost.mod_feature_post,
      when_: modFeaturePost.mod_feature_post.published_at,
    },
    moderator: modFeaturePost.moderator
      ? compatPerson(modFeaturePost.moderator)
      : undefined,
    post: compatPost(modFeaturePost.post),
    community: compatCommunity(modFeaturePost.community),
  };
}

function compatLemmyModRemoveCommentView(
  modRemoveComment: LemmyV1ModRemoveCommentView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modRemoveComment,
    mod_remove_comment: {
      ...modRemoveComment.mod_remove_comment,
      when_: modRemoveComment.mod_remove_comment.published_at,
    },
    moderator: modRemoveComment.moderator
      ? compatPerson(modRemoveComment.moderator)
      : undefined,
    comment: compatComment(modRemoveComment.comment),
    commenter: compatPerson(modRemoveComment.other_person),
    post: compatPost(modRemoveComment.post),
    community: compatCommunity(modRemoveComment.community),
  };
}

function compatLemmyModRemoveCommunityView(
  modRemoveCommunity: LemmyV1ModRemoveCommunityView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modRemoveCommunity,
    mod_remove_community: {
      ...modRemoveCommunity.mod_remove_community,
      when_: modRemoveCommunity.mod_remove_community.published_at,
    },
    moderator: modRemoveCommunity.moderator
      ? compatPerson(modRemoveCommunity.moderator)
      : undefined,
    community: compatCommunity(modRemoveCommunity.community),
  };
}

function compatLemmyModRemovePostView(
  modRemovePost: LemmyV1ModRemovePostView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modRemovePost,
    mod_remove_post: {
      ...modRemovePost.mod_remove_post,
      when_: modRemovePost.mod_remove_post.published_at,
    },
    moderator: modRemovePost.moderator
      ? compatPerson(modRemovePost.moderator)
      : undefined,
    post: compatPost(modRemovePost.post),
    community: compatCommunity(modRemovePost.community),
  };
}

function compatLemmyModTransferCommunityView(
  modTransferCommunity: LemmyV1ModTransferCommunityView,
): GetModlogResponse["modlog"][0] {
  return {
    ...modTransferCommunity,
    mod_transfer_community: {
      ...modTransferCommunity.mod_transfer_community,
      when_: modTransferCommunity.mod_transfer_community.published_at,
    },
    moderator: modTransferCommunity.moderator
      ? compatPerson(modTransferCommunity.moderator)
      : undefined,
    community: compatCommunity(modTransferCommunity.community),
    modded_person: compatPerson(modTransferCommunity.other_person),
  };
}

export function compatLemmyFederatedInstances(
  federatedInstances: LemmyV1FederatedInstances,
): FederatedInstances {
  return {
    ...federatedInstances,
    linked: federatedInstances.linked.map(
      compatLemmyInstanceWithFederationState,
    ),
    allowed: federatedInstances.allowed.map(
      compatLemmyInstanceWithFederationState,
    ),
    blocked: federatedInstances.blocked.map(
      compatLemmyInstanceWithFederationState,
    ),
  };
}

function compatLemmyInstanceWithFederationState(
  instance: LemmyV1InstanceWithFederationState,
): InstanceWithFederationState {
  return {
    ...instance,
    published: instance.published_at,
  };
}
