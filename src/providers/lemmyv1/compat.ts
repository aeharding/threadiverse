import type * as LemmyV1 from "lemmy-js-client-v1";

import { InvalidPayloadError } from "../../errors";
import * as types from "../../types";

// TODO Temporary until we support other types
export type LemmyV1PostCommentReportOnly =
  | (LemmyV1.CommentReportView & { type_: "Comment" })
  | (LemmyV1.PostReportView & { type_: "Post" });

export function fromPageParams<const T extends types.PageParams>(
  params: T,
): Omit<T, "page_cursor"> & { page_cursor?: string } {
  if (typeof params.page_cursor === "number")
    throw new InvalidPayloadError("page_cursor must be string in lemmyv1");

  return {
    ...params,
    page_cursor: params.page_cursor,
  };
}

export function toCommentMentionView(
  personMentionView: LemmyV1.PersonCommentMentionView,
): types.PersonMentionView {
  return {
    ...personMentionView,
    banned_from_community:
      !!personMentionView.community_actions?.ban_expires_at,
    comment: toComment(personMentionView.comment),
    community: toCommunity(personMentionView.community),
    counts: toCommentCounts(personMentionView.comment),
    creator: toPerson(personMentionView.creator),
    creator_banned_from_community:
      !!personMentionView.community_actions?.ban_expires_at,
    creator_blocked: !!personMentionView.person_actions?.blocked_at,
    person_mention: {
      ...personMentionView.person_comment_mention,
      published: personMentionView.person_comment_mention.published_at,
    },
    post: toPost(personMentionView.post),
    recipient: toPerson(personMentionView.recipient),
    saved: !!personMentionView.comment_actions?.saved_at,
    subscribed: toFollowState(
      personMentionView.community_actions?.follow_state,
    ),
  };
}

export function toCommentReplyView(
  commentReply: LemmyV1.CommentReplyView,
): types.CommentReplyView {
  return {
    ...commentReply,
    banned_from_community: !!commentReply.community_actions?.ban_expires_at,
    comment: toComment(commentReply.comment),
    comment_reply: {
      ...commentReply.comment_reply,
      published: commentReply.comment_reply.published_at,
    },
    community: toCommunity(commentReply.community),
    counts: toCommentCounts(commentReply.comment),
    creator: toPerson(commentReply.creator),
    creator_blocked: !!commentReply.person_actions?.blocked_at,
    post: toPost(commentReply.post),
    recipient: toPerson(commentReply.recipient),
    saved: !!commentReply.comment_actions?.saved_at,
    subscribed: toFollowState(commentReply.community_actions?.follow_state),
  };
}

export function toCommentReportView(
  commentReport: LemmyV1.CommentReportView,
): types.CommentReportView {
  return {
    ...commentReport,
    comment: toComment(commentReport.comment),
    comment_creator: toPerson(commentReport.comment_creator),
    comment_report: {
      ...commentReport.comment_report,
      published: commentReport.comment_report.published_at,
    },
    community: toCommunity(commentReport.community),
    counts: toCommentCounts(commentReport.comment),
    creator: toPerson(commentReport.creator),
    creator_banned_from_community:
      !!commentReport.community_actions?.ban_expires_at,
    creator_blocked: !!commentReport.person_actions?.blocked_at,
    creator_is_moderator: false,
    my_vote: commentReport.comment_actions?.like_score,
    post: toPost(commentReport.post),
    resolver: commentReport.resolver
      ? toPerson(commentReport.resolver)
      : undefined,
    saved: !!commentReport.comment_actions?.saved_at,
    subscribed: toFollowState(commentReport.community_actions?.follow_state),
  };
}

export function toCommentView(
  commentView: LemmyV1.CommentView,
): types.CommentView {
  return {
    ...commentView,
    banned_from_community: !!commentView.community_actions?.ban_expires_at,
    comment: toComment(commentView.comment),
    community: toCommunity(commentView.community),
    counts: toCommentCounts(commentView.comment),
    creator: toPerson(commentView.creator),
    post: toPost(commentView.post),
    subscribed: toFollowState(commentView.community_actions?.follow_state),
    ...toCommentViewActions(commentView.comment_actions),
  };
}

export function toCommunityCounts(
  community: LemmyV1.Community,
): types.CommunityAggregates {
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

export function toCommunityModeratorView(
  communityModerator: LemmyV1.CommunityModeratorView,
): types.CommunityModeratorView {
  return {
    ...communityModerator,
    community: toCommunity(communityModerator.community),
    moderator: toPerson(communityModerator.moderator),
  };
}

export function toCommunityView(
  communityView: LemmyV1.CommunityView,
): types.CommunityView {
  return {
    ...communityView,
    community: toCommunity(communityView.community),
    counts: toCommunityCounts(communityView.community),
    ...toViewUserActions(communityView.community_actions),
  };
}

export function toFederatedInstances(
  federatedInstances: LemmyV1.FederatedInstances,
): types.FederatedInstances {
  return {
    ...federatedInstances,
    allowed: federatedInstances.allowed.map(toInstanceWithFederationState),
    blocked: federatedInstances.blocked.map(toInstanceWithFederationState),
    linked: federatedInstances.linked.map(toInstanceWithFederationState),
  };
}

export function toInboxCombinedView(
  inboxItem: LemmyV1.InboxCombinedView,
): types.Notification | undefined {
  switch (inboxItem.type_) {
    case "CommentMention":
      return toCommentMentionView(inboxItem);
    case "CommentReply":
      return toCommentReplyView(inboxItem);
    case "PrivateMessage":
      return toPrivateMessageView(inboxItem);
    default:
      return; // TODO support other inbox items
  }
}

export function toModlogView(
  modlog: LemmyV1.ModlogCombinedView,
): types.ModlogItem | undefined {
  switch (modlog.type_) {
    case "AdminAllowInstance":
    case "AdminBlockInstance":
    case "ModChangeCommunityVisibility":
      return undefined; // Currently Threadiverse doesn't support these types
    case "AdminPurgeComment":
      return toAdminPurgeCommentView(modlog);
    case "AdminPurgeCommunity":
      return toAdminPurgeCommunityView(modlog);
    case "AdminPurgePerson":
      return toAdminPurgePersonView(modlog);
    case "AdminPurgePost":
      return toAdminPurgePostView(modlog);
    case "ModAdd":
      return toModAddView(modlog);
    case "ModAddCommunity":
      return toModAddCommunityView(modlog);
    case "ModBan":
      return toModBanView(modlog);
    case "ModBanFromCommunity":
      return toModBanFromCommunityView(modlog);
    case "ModFeaturePost":
      return toModFeaturePostView(modlog);
    case "ModLockPost":
      return toModLockPostView(modlog);
    case "ModRemoveComment":
      return toModRemoveCommentView(modlog);
    case "ModRemoveCommunity":
      return toModRemoveCommunityView(modlog);
    case "ModRemovePost":
      return toModRemovePostView(modlog);
    case "ModTransferCommunity":
      return toModTransferCommunityView(modlog);
  }
}

export function toPersonView(personView: LemmyV1.PersonView): types.PersonView {
  return {
    ...personView,
    counts: toPersonCounts(personView.person),
    person: toPerson(personView.person),
  };
}

export function toPostReportView(
  postReport: LemmyV1.PostReportView,
): types.PostReportView {
  return {
    ...postReport,
    community: toCommunity(postReport.community),
    counts: toPostCounts(postReport.post),
    creator: toPerson(postReport.creator),
    creator_banned_from_community:
      !!postReport.community_actions?.ban_expires_at,
    creator_blocked: !!postReport.person_actions?.blocked_at,
    creator_is_moderator: false,
    hidden: !!postReport.post_actions?.hidden_at,
    post: toPost(postReport.post),
    post_creator: toPerson(postReport.post_creator),
    post_report: {
      ...postReport.post_report,
      published: postReport.post_report.published_at,
    },
    read: !!postReport.post_actions?.read_at,
    resolver: postReport.resolver ? toPerson(postReport.resolver) : undefined,
    saved: !!postReport.post_actions?.saved_at,
    subscribed: toFollowState(postReport.community_actions?.follow_state),
    unread_comments: postReport.post_actions?.read_comments_at
      ? postReport.post.comments -
        (postReport.post_actions.read_comments_amount ?? 0)
      : 0,
  };
}

export function toPostView(postView: LemmyV1.PostView): types.PostView {
  return {
    ...postView,
    banned_from_community: !!postView.community_actions?.ban_expires_at,
    community: toCommunity(postView.community),
    counts: toPostCounts(postView.post),
    creator: toPerson(postView.creator),
    creator_blocked: !!postView.person_actions?.blocked_at,
    post: toPost(postView.post),
    ...toPostViewUserActions(postView.post_actions, postView.post.comments),
    ...toViewUserActions(postView.community_actions),
  };
}

export function toPrivateMessageView(
  privateMessage: LemmyV1.PrivateMessageView,
): types.PrivateMessageView {
  return {
    ...privateMessage,
    creator: toPerson(privateMessage.creator),
    private_message: {
      ...privateMessage.private_message,
      published: privateMessage.private_message.published_at,
    },
    recipient: toPerson(privateMessage.recipient),
  };
}

export function toReportView(
  report: LemmyV1PostCommentReportOnly,
): types.CommentReportView | types.PostReportView {
  switch (report.type_) {
    case "Comment":
      return toCommentReportView(report);
    case "Post":
      return toPostReportView(report);
  }
}

export function toSearchItem(
  item: LemmyV1.SearchCombinedView,
): types.SearchItem | undefined {
  switch (item.type_) {
    case "Comment":
      return toCommentView(item);
    case "Community":
      return toCommunityView(item);
    case "MultiCommunity":
      return; // Not supported
    case "Person":
      return toPersonView(item);
    case "Post":
      return toPostView(item);
  }
}

export function toSiteView(siteView: LemmyV1.SiteView): types.SiteView {
  return {
    ...siteView,
    site: toSite(siteView.site),
  };
}

function toAdminPurgeCommentView(
  adminPurgeComment: LemmyV1.AdminPurgeCommentView,
): types.ModlogItem {
  return {
    ...adminPurgeComment,
    admin: adminPurgeComment.admin
      ? toPerson(adminPurgeComment.admin)
      : undefined,
    admin_purge_comment: {
      ...adminPurgeComment.admin_purge_comment,
      when_: adminPurgeComment.admin_purge_comment.published_at,
    },
    post: toPost(adminPurgeComment.post),
  };
}

function toAdminPurgeCommunityView(
  adminPurgeCommunity: LemmyV1.AdminPurgeCommunityView,
): types.ModlogItem {
  return {
    ...adminPurgeCommunity,
    admin: adminPurgeCommunity.admin
      ? toPerson(adminPurgeCommunity.admin)
      : undefined,
    admin_purge_community: {
      ...adminPurgeCommunity.admin_purge_community,
      when_: adminPurgeCommunity.admin_purge_community.published_at,
    },
  };
}

function toAdminPurgePersonView(
  adminPurgePerson: LemmyV1.AdminPurgePersonView,
): types.ModlogItem {
  return {
    ...adminPurgePerson,
    admin: adminPurgePerson.admin
      ? toPerson(adminPurgePerson.admin)
      : undefined,
    admin_purge_person: {
      ...adminPurgePerson.admin_purge_person,
      when_: adminPurgePerson.admin_purge_person.published_at,
    },
  };
}

function toAdminPurgePostView(
  adminPurgePost: LemmyV1.AdminPurgePostView,
): types.ModlogItem {
  return {
    ...adminPurgePost,
    admin: adminPurgePost.admin ? toPerson(adminPurgePost.admin) : undefined,
    admin_purge_post: {
      ...adminPurgePost.admin_purge_post,
      when_: adminPurgePost.admin_purge_post.published_at,
    },
    community: toCommunity(adminPurgePost.community),
  };
}

function toComment(comment: LemmyV1.Comment): types.Comment {
  return {
    ...comment,
    published: comment.published_at,
  };
}

function toCommentCounts(comment: LemmyV1.Comment): types.CommentAggregates {
  return {
    child_count: comment.child_count,
    comment_id: comment.id,
    downvotes: comment.downvotes,
    published: comment.published_at,
    score: comment.score,
    upvotes: comment.upvotes,
  };
}

function toCommentViewActions(
  commentActions: LemmyV1.CommentActions | undefined,
): Pick<types.CommentView, "my_vote" | "saved"> {
  return {
    my_vote: commentActions?.like_score,
    saved: !!commentActions?.saved_at,
  };
}

function toCommunity(community: LemmyV1.Community): types.Community {
  return {
    ...community,
    actor_id: community.ap_id,
    hidden: false, // TODO what does this mean, v0 vs v1?
    published: community.published_at,
  };
}

function toFollowState(
  followState: LemmyV1.CommunityFollowerState | undefined,
): types.SubscribedType {
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

function toInstanceWithFederationState(
  instance: LemmyV1.InstanceWithFederationState,
): types.InstanceWithFederationState {
  return {
    ...instance,
    published: instance.published_at,
  };
}

function toModAddCommunityView(
  modAddCommunity: LemmyV1.ModAddCommunityView,
): types.ModlogItem {
  return {
    ...modAddCommunity,
    community: toCommunity(modAddCommunity.community),
    mod_add_community: {
      ...modAddCommunity.mod_add_community,
      when_: modAddCommunity.mod_add_community.published_at,
    },
    modded_person: toPerson(modAddCommunity.other_person),
    moderator: modAddCommunity.moderator
      ? toPerson(modAddCommunity.moderator)
      : undefined,
  };
}

function toModAddView(modAdd: LemmyV1.ModAddView): types.ModlogItem {
  return {
    ...modAdd,
    mod_add: {
      ...modAdd.mod_add,
      when_: modAdd.mod_add.published_at,
    },
    modded_person: toPerson(modAdd.other_person),
    moderator: modAdd.moderator ? toPerson(modAdd.moderator) : undefined,
  };
}

function toModBanFromCommunityView(
  modBanFromCommunity: LemmyV1.ModBanFromCommunityView,
): types.ModlogItem {
  return {
    ...modBanFromCommunity,
    banned_person: toPerson(modBanFromCommunity.other_person),
    community: toCommunity(modBanFromCommunity.community),
    mod_ban_from_community: {
      ...modBanFromCommunity.mod_ban_from_community,
      when_: modBanFromCommunity.mod_ban_from_community.published_at,
    },
    moderator: modBanFromCommunity.moderator
      ? toPerson(modBanFromCommunity.moderator)
      : undefined,
  };
}

function toModBanView(modBan: LemmyV1.ModBanView): types.ModlogItem {
  return {
    ...modBan,
    banned_person: toPerson(modBan.other_person),
    mod_ban: {
      ...modBan.mod_ban,
      when_: modBan.mod_ban.published_at,
    },
    moderator: modBan.moderator ? toPerson(modBan.moderator) : undefined,
  };
}

function toModFeaturePostView(
  modFeaturePost: LemmyV1.ModFeaturePostView,
): types.ModlogItem {
  return {
    ...modFeaturePost,
    community: toCommunity(modFeaturePost.community),
    mod_feature_post: {
      ...modFeaturePost.mod_feature_post,
      when_: modFeaturePost.mod_feature_post.published_at,
    },
    moderator: modFeaturePost.moderator
      ? toPerson(modFeaturePost.moderator)
      : undefined,
    post: toPost(modFeaturePost.post),
  };
}

function toModLockPostView(
  modLockPost: LemmyV1.ModLockPostView,
): types.ModlogItem {
  return {
    ...modLockPost,
    community: toCommunity(modLockPost.community),
    mod_lock_post: {
      ...modLockPost.mod_lock_post,
      when_: modLockPost.mod_lock_post.published_at,
    },
    moderator: modLockPost.moderator
      ? toPerson(modLockPost.moderator)
      : undefined,
    post: toPost(modLockPost.post),
  };
}

function toModRemoveCommentView(
  modRemoveComment: LemmyV1.ModRemoveCommentView,
): types.ModlogItem {
  return {
    ...modRemoveComment,
    comment: toComment(modRemoveComment.comment),
    commenter: toPerson(modRemoveComment.other_person),
    community: toCommunity(modRemoveComment.community),
    mod_remove_comment: {
      ...modRemoveComment.mod_remove_comment,
      when_: modRemoveComment.mod_remove_comment.published_at,
    },
    moderator: modRemoveComment.moderator
      ? toPerson(modRemoveComment.moderator)
      : undefined,
    post: toPost(modRemoveComment.post),
  };
}

function toModRemoveCommunityView(
  modRemoveCommunity: LemmyV1.ModRemoveCommunityView,
): types.ModlogItem {
  return {
    ...modRemoveCommunity,
    community: toCommunity(modRemoveCommunity.community),
    mod_remove_community: {
      ...modRemoveCommunity.mod_remove_community,
      when_: modRemoveCommunity.mod_remove_community.published_at,
    },
    moderator: modRemoveCommunity.moderator
      ? toPerson(modRemoveCommunity.moderator)
      : undefined,
  };
}

function toModRemovePostView(
  modRemovePost: LemmyV1.ModRemovePostView,
): types.ModlogItem {
  return {
    ...modRemovePost,
    community: toCommunity(modRemovePost.community),
    mod_remove_post: {
      ...modRemovePost.mod_remove_post,
      when_: modRemovePost.mod_remove_post.published_at,
    },
    moderator: modRemovePost.moderator
      ? toPerson(modRemovePost.moderator)
      : undefined,
    post: toPost(modRemovePost.post),
  };
}

function toModTransferCommunityView(
  modTransferCommunity: LemmyV1.ModTransferCommunityView,
): types.ModlogItem {
  return {
    ...modTransferCommunity,
    community: toCommunity(modTransferCommunity.community),
    mod_transfer_community: {
      ...modTransferCommunity.mod_transfer_community,
      when_: modTransferCommunity.mod_transfer_community.published_at,
    },
    modded_person: toPerson(modTransferCommunity.other_person),
    moderator: modTransferCommunity.moderator
      ? toPerson(modTransferCommunity.moderator)
      : undefined,
  };
}

function toPerson(person: LemmyV1.Person): types.Person {
  return {
    ...person,
    actor_id: person.ap_id,
    published: person.published_at,
  };
}

function toPersonCounts(person: LemmyV1.Person): types.PersonAggregates {
  return {
    comment_count: person.comment_count,
    post_count: person.post_count,
  };
}

function toPost(post: LemmyV1.Post): types.Post {
  return {
    ...post,
    published: post.published_at,
  };
}

function toPostCounts(post: LemmyV1.Post): types.PostAggregates {
  return {
    comments: post.comments,
    downvotes: post.downvotes,
    newest_comment_time: post.newest_comment_time_at,
    published: post.published_at,
    score: post.score,
    upvotes: post.upvotes,
  };
}

function toPostViewUserActions(
  postActions: LemmyV1.PostActions | undefined,
  totalComments: number,
): Pick<types.PostView, "hidden" | "read" | "saved" | "unread_comments"> {
  return {
    hidden: !!postActions?.hidden_at,
    read: !!postActions?.read_at,
    saved: !!postActions?.saved_at,
    unread_comments: postActions?.read_comments_at
      ? totalComments - (postActions.read_comments_amount ?? 0)
      : 0,
  };
}

function toSite(site: LemmyV1.Site): types.Site {
  return {
    ...site,
    actor_id: site.ap_id,
  };
}

function toViewUserActions(
  userActions: LemmyV1.CommunityActions | undefined,
): Pick<types.CommunityView, "blocked" | "subscribed"> {
  return {
    blocked: !!userActions?.blocked_at,
    subscribed: toFollowState(userActions?.follow_state),
  };
}
