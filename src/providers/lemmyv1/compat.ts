import type * as LemmyV1 from "lemmy-js-client-v1";

import { InvalidPayloadError } from "../../errors";
import * as types from "../../types";

// TODO Temporary until we support other types
export type LemmyV1PostCommentReportOnly =
  | (LemmyV1.CommentReportView & { type_: "comment" })
  | (LemmyV1.PostReportView & { type_: "post" });

export function fromPageParams<const T extends types.PageParams>(
  params: T
): Omit<T, "page_cursor"> & { page_cursor?: string } {
  if (typeof params.page_cursor === "number")
    throw new InvalidPayloadError("page_cursor must be string in lemmyv1");

  return {
    ...params,
    page_cursor: params.page_cursor,
  };
}

export function toCommentReportView(
  commentReport: LemmyV1.CommentReportView
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
    my_vote: toMyVote(commentReport.comment_actions),
    post: toPost(commentReport.post),
    resolver: commentReport.resolver
      ? toPerson(commentReport.resolver)
      : undefined,
    saved: !!commentReport.comment_actions?.saved_at,
    subscribed: toFollowState(commentReport.community_actions?.follow_state),
  };
}

export function toCommentView(
  commentView: LemmyV1.CommentView
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
  community: LemmyV1.Community
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
  communityModerator: LemmyV1.CommunityModeratorView
): types.CommunityModeratorView {
  return {
    ...communityModerator,
    community: toCommunity(communityModerator.community),
    moderator: toPerson(communityModerator.moderator),
  };
}

export function toCommunityView(
  communityView: LemmyV1.CommunityView
): types.CommunityView {
  return {
    ...communityView,
    community: toCommunity(communityView.community),
    counts: toCommunityCounts(communityView.community),
    ...toViewUserActions(communityView.community_actions),
  };
}

// Maps v1 ModlogKind values to threadiverse ModlogKind. Absent entries
// (admin_allow_instance, admin_block_instance) are federation-related and
// don't have a threadiverse equivalent yet.
const MODLOG_KIND_MAP: Partial<Record<LemmyV1.ModlogKind, types.ModlogKind>> =
  {
    admin_add: "admin_add",
    admin_ban: "admin_ban",
    admin_feature_post_site: "admin_feature_post_site",
    admin_purge_comment: "admin_purge_comment",
    admin_purge_community: "admin_purge_community",
    admin_purge_person: "admin_purge_person",
    admin_purge_post: "admin_purge_post",
    admin_remove_community: "admin_remove_community",
    mod_add_to_community: "mod_add_to_community",
    mod_ban_from_community: "mod_ban_from_community",
    mod_change_community_visibility: "mod_change_community_visibility",
    mod_feature_post_community: "mod_feature_post_community",
    mod_lock_comment: "mod_lock_comment",
    mod_lock_post: "mod_lock_post",
    mod_remove_comment: "mod_remove_comment",
    mod_remove_post: "mod_remove_post",
    mod_transfer_community: "mod_transfer_community",
    mod_warn_comment: "mod_warn_comment",
    mod_warn_post: "mod_warn_post",
  };

export function toModlogView(
  v: LemmyV1.ModlogView
): types.ModlogItem | undefined {
  const kind = MODLOG_KIND_MAP[v.modlog.kind];
  if (!kind) return undefined;

  return {
    moderator: v.moderator ? toPerson(v.moderator) : undefined,
    modlog: {
      expires_at: v.modlog.expires_at ?? undefined,
      id: v.modlog.id,
      is_revert: v.modlog.is_revert,
      kind,
      published_at: v.modlog.published_at,
      reason: v.modlog.reason ?? undefined,
    },
    target_comment: v.target_comment ? toComment(v.target_comment) : undefined,
    target_community: v.target_community
      ? toCommunity(v.target_community)
      : undefined,
    target_person: v.target_person ? toPerson(v.target_person) : undefined,
    target_post: v.target_post ? toPost(v.target_post) : undefined,
  };
}

export function toMyUserInfo(info: LemmyV1.MyUserInfo): types.MyUserInfo {
  return {
    community_blocks: info.community_blocks.map(toCommunity),
    follows: info.follows.map((f) => ({
      community: toCommunity(f.community),
      follower: toPerson(f.follower),
    })),
    instance_blocks: [
      ...info.instance_communities_blocks.map(toInstance),
      ...info.instance_persons_blocks.map(toInstance),
    ],
    local_user_view: {
      counts: {
        comment_count: info.local_user_view.person.comment_count,
        post_count: info.local_user_view.person.post_count,
      },
      local_user: {
        admin: info.local_user_view.local_user.admin,
        show_nsfw: info.local_user_view.local_user.show_nsfw,
      },
      person: toPerson(info.local_user_view.person),
    },
    moderates: info.moderates.map(toCommunityModeratorView),
    person_blocks: info.person_blocks.map(toPerson),
  };
}

export function toPersonView(personView: LemmyV1.PersonView): types.PersonView {
  return {
    ...personView,
    counts: toPersonCounts(personView.person),
    person: toPerson(personView.person),
  };
}

export function toPostReportView(
  postReport: LemmyV1.PostReportView
): types.PostReportView {
  return {
    ...postReport,
    community: toCommunity(postReport.community),
    counts: toPostCounts(postReport.post),
    creator: toPerson(postReport.creator),
    creator_banned_from_community:
      !!postReport.community_actions?.ban_expires_at,
    creator_blocked: !!postReport.person_actions?.blocked_at,
    hidden: !!postReport.post_actions?.hidden_at,
    my_vote: toPostMyVote(postReport.post_actions),
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
      : postReport.post.comments,
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
  privateMessage: LemmyV1.PrivateMessageView
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
  report: LemmyV1PostCommentReportOnly
): types.CommentReportView | types.PostReportView {
  switch (report.type_) {
    case "comment":
      return toCommentReportView(report);
    case "post":
      return toPostReportView(report);
  }
}

export function toSiteView(
  siteView: LemmyV1.SiteView,
  captcha_enabled: boolean
): types.SiteView {
  return {
    local_site: {
      application_question: siteView.local_site.application_question,
      captcha_enabled,
      comment_downvotes: siteView.local_site.comment_downvotes,
      comment_upvotes: siteView.local_site.comment_upvotes,
      legal_information: siteView.local_site.legal_information,
      post_downvotes: siteView.local_site.post_downvotes,
      post_upvotes: siteView.local_site.post_upvotes,
      registration_mode: siteView.local_site.registration_mode,
      require_email_verification:
        siteView.local_site.email_verification_required,
    },
    site: toSite(siteView.site),
  };
}

export function toSupportedNotificationView(
  item: LemmyV1.NotificationView
): types.NotificationView | undefined {
  switch (item.notification.kind) {
    case "mention":
    case "private_message":
    case "reply":
      switch (item.data.type_) {
        case "comment":
          return {
            ...item,
            data: { type_: "comment", ...toCommentView(item.data) },
          };
        case "post":
          return {
            ...item,
            data: { type_: "post", ...toPostView(item.data) },
          };
        case "private_message":
          return {
            ...item,
            data: {
              type_: "private_message",
              ...toPrivateMessageView(item.data),
            },
          };
        default:
          return undefined;
      }
    case "mod_action":
    case "subscribed":
      return;
  }
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
  commentActions: LemmyV1.CommentActions | undefined
): Pick<types.CommentView, "my_vote" | "saved"> {
  return {
    my_vote: toMyVote(commentActions),
    saved: !!commentActions?.saved_at,
  };
}

function toCommunity(community: LemmyV1.Community): types.Community {
  return {
    ...community,
    actor_id: community.ap_id,
    // v0's `description` was renamed/split in v1: `sidebar` holds the
    // long-form markdown shown in the sidebar (closest analogue), `summary`
    // is a one-line summary.
    description: community.sidebar ?? community.summary,
    // v1 replaced the boolean `hidden` flag with the `visibility` enum;
    // map "unlisted" back to the legacy boolean for consumers that still use it.
    hidden: community.visibility === "unlisted",
    published: community.published_at,
    updated: community.updated_at,
  };
}

function toFollowState(
  followState: LemmyV1.CommunityFollowerState | undefined
): types.SubscribedType {
  switch (followState) {
    case "accepted":
      return "Subscribed";
    case "approval_required":
      return "ApprovalRequired";
    case "denied":
    case undefined:
      return "NotSubscribed";
    case "pending":
      return "Pending";
  }
}

function toInstance(instance: LemmyV1.Instance): types.Instance {
  return {
    ...instance,
    published: instance.published_at,
    updated: instance.updated_at,
  };
}

function toMyVote(actions: LemmyV1.CommentActions | undefined) {
  if (actions?.voted_at === undefined) return undefined;
  return actions.vote_is_upvote ? 1 : -1;
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
    newest_comment_time: post.newest_comment_time_at ?? post.published_at,
    published: post.published_at,
    score: post.score,
    upvotes: post.upvotes,
  };
}

function toPostMyVote(actions: LemmyV1.PostActions | undefined) {
  if (actions?.voted_at === undefined) return undefined;
  return actions.vote_is_upvote ? 1 : -1;
}

function toPostViewUserActions(
  postActions: LemmyV1.PostActions | undefined,
  totalComments: number
): Pick<types.PostView, "hidden" | "my_vote" | "read" | "saved" | "unread_comments"> {
  return {
    hidden: !!postActions?.hidden_at,
    my_vote: toPostMyVote(postActions),
    read: !!postActions?.read_at,
    saved: !!postActions?.saved_at,
    unread_comments: postActions?.read_comments_at
      ? totalComments - (postActions.read_comments_amount ?? 0)
      : totalComments,
  };
}

function toSite(site: LemmyV1.Site): types.Site {
  return {
    ...site,
    actor_id: site.ap_id,
  };
}

function toViewUserActions(
  userActions: LemmyV1.CommunityActions | undefined
): Pick<types.CommunityView, "blocked" | "subscribed"> {
  return {
    blocked: !!userActions?.blocked_at,
    subscribed: toFollowState(userActions?.follow_state),
  };
}
