import type * as LemmyV1 from "lemmy-js-client-v1";

import { InvalidPayloadError } from "../../errors";
import { cleanThreadiverseParams } from "../../helpers";
import * as types from "../../types";

// TODO Temporary until we support other types
export type LemmyV1PostCommentReportOnly =
  | (LemmyV1.CommentReportView & { type_: "comment" })
  | (LemmyV1.PostReportView & { type_: "post" });

export function fromPageParams<const T extends types.PageParams>(
  params: T,
): Omit<Omit<T, "mode">, "page_cursor"> & { page_cursor?: string } {
  if (typeof params.page_cursor === "number")
    throw new InvalidPayloadError("page_cursor must be string in lemmyv1");

  const { page_cursor, ...rest } = cleanThreadiverseParams(params);
  return {
    ...rest,
    page_cursor: page_cursor as string | undefined,
  };
}

export function toCommentReportView(
  v: LemmyV1.CommentReportView,
): types.CommentReportView {
  return {
    ...v,
    creator_banned_from_community: !!v.community_actions?.ban_expires_at,
    creator_blocked: !!v.person_actions?.blocked_at,
    my_vote: toVote(v.comment_actions),
    saved: !!v.comment_actions?.saved_at,
    subscribed: toFollowState(v.community_actions?.follow_state),
  };
}

export function toCommentView(v: LemmyV1.CommentView): types.CommentView {
  return {
    ...v,
    banned_from_community: !!v.community_actions?.ban_expires_at,
    my_vote: toVote(v.comment_actions),
    saved: !!v.comment_actions?.saved_at,
    subscribed: toFollowState(v.community_actions?.follow_state),
  };
}

export function toCommunityView(v: LemmyV1.CommunityView): types.CommunityView {
  return {
    ...v,
    blocked: !!v.community_actions?.blocked_at,
    notifications: v.community_actions?.notifications ?? "replies_and_mentions",
    subscribed: toFollowState(v.community_actions?.follow_state),
  };
}

// Maps v1 ModlogKind values to threadiverse ModlogKind. Absent entries
// (admin_allow_instance, admin_block_instance) are federation-related and
// don't have a threadiverse equivalent yet.
const MODLOG_KIND_MAP: Partial<Record<LemmyV1.ModlogKind, types.ModlogKind>> = {
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
  v: LemmyV1.ModlogView,
): types.ModlogItem | undefined {
  const kind = MODLOG_KIND_MAP[v.modlog.kind];
  if (!kind) return undefined;

  return {
    moderator: v.moderator,
    modlog: {
      expires_at: v.modlog.expires_at ?? undefined,
      id: v.modlog.id,
      is_revert: v.modlog.is_revert,
      kind,
      published_at: v.modlog.published_at,
      reason: v.modlog.reason ?? undefined,
    },
    target_comment: v.target_comment,
    target_community: v.target_community,
    target_person: v.target_person,
    target_post: v.target_post,
  };
}

export function toMyUserInfo(info: LemmyV1.MyUserInfo): types.MyUserInfo {
  return {
    community_blocks: info.community_blocks,
    follows: info.follows,
    // v1 split instance_blocks into two separate lists; merge for consumers.
    instance_blocks: [
      ...info.instance_communities_blocks,
      ...info.instance_persons_blocks,
    ],
    local_user_view: {
      local_user: {
        admin: info.local_user_view.local_user.admin,
        show_nsfw: info.local_user_view.local_user.show_nsfw,
      },
      person: info.local_user_view.person,
    },
    moderates: info.moderates,
    person_blocks: info.person_blocks,
  };
}

export function toPersonView(v: LemmyV1.PersonView): types.PersonView {
  return { is_admin: v.is_admin, person: v.person };
}

export function toPostReportView(
  v: LemmyV1.PostReportView,
): types.PostReportView {
  return {
    ...v,
    creator_banned_from_community: !!v.community_actions?.ban_expires_at,
    creator_blocked: !!v.person_actions?.blocked_at,
    hidden: !!v.post_actions?.hidden_at,
    my_vote: toVote(v.post_actions),
    read: !!v.post_actions?.read_at,
    saved: !!v.post_actions?.saved_at,
    subscribed: toFollowState(v.community_actions?.follow_state),
    unread_comments: toUnreadComments(v.post, v.post_actions),
  };
}

export function toPostView(v: LemmyV1.PostView): types.PostView {
  return {
    ...v,
    banned_from_community: !!v.community_actions?.ban_expires_at,
    creator_blocked: !!v.person_actions?.blocked_at,
    hidden: !!v.post_actions?.hidden_at,
    my_vote: toVote(v.post_actions),
    notifications: v.post_actions?.notifications ?? "replies_and_mentions",
    read: !!v.post_actions?.read_at,
    saved: !!v.post_actions?.saved_at,
    subscribed: toFollowState(v.community_actions?.follow_state),
    unread_comments: toUnreadComments(v.post, v.post_actions),
  };
}

export function toPrivateMessageView(
  v: LemmyV1.PrivateMessageView,
): types.PrivateMessageView {
  return v;
}

export function toReportView(
  report: LemmyV1PostCommentReportOnly,
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
  captcha_enabled: boolean,
): types.SiteView {
  return {
    local_site: { ...siteView.local_site, captcha_enabled },
    site: siteView.site,
  };
}

export function toSupportedNotificationView(
  item: LemmyV1.NotificationView,
): types.NotificationView | undefined {
  // v1's wire sends JSON `null` (not omitted) for the *_id fields that don't
  // apply to a given notification kind. The lib's `.d.ts` types these as
  // `?: number` so TS doesn't catch it, and our schema accepts only
  // `undefined` for optionals — without this normalization, SafeClient's
  // zod parse rejects every notification with a `modlog_id: null` etc.
  const notification: types.Notification = {
    ...item.notification,
    comment_id: nullToUndef(item.notification.comment_id),
    modlog_id: nullToUndef(item.notification.modlog_id),
    post_id: nullToUndef(item.notification.post_id),
    private_message_id: nullToUndef(item.notification.private_message_id),
  };

  switch (item.notification.kind) {
    case "mention":
    case "private_message":
    case "reply":
      switch (item.data.type_) {
        case "comment":
          return {
            ...item,
            data: { type_: "comment", ...toCommentView(item.data) },
            notification,
          };
        case "post":
          return {
            ...item,
            data: { type_: "post", ...toPostView(item.data) },
            notification,
          };
        case "private_message":
          return { ...item, data: item.data, notification };
        default:
          return undefined;
      }
    case "mod_action": {
      // `data` is a v1 ModlogView; upconvert to our flat ModlogItem shape.
      if (item.data.type_ !== "mod_action") return undefined;
      const modlogItem = toModlogView(item.data);
      if (!modlogItem) return undefined; // kind not in our enum
      return {
        ...item,
        data: { type_: "mod_action", ...modlogItem },
        notification,
      };
    }
    case "subscribed":
      switch (item.data.type_) {
        case "comment":
          return {
            ...item,
            data: { type_: "comment", ...toCommentView(item.data) },
            notification,
          };
        case "post":
          return {
            ...item,
            data: { type_: "post", ...toPostView(item.data) },
            notification,
          };
        default:
          return undefined;
      }
  }
}

function nullToUndef<T>(v: null | T | undefined): T | undefined {
  return v ?? undefined;
}

function toFollowState(
  followState: LemmyV1.CommunityFollowerState | undefined,
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

function toUnreadComments(
  post: LemmyV1.Post,
  actions: LemmyV1.PostActions | undefined,
): number {
  // v1 sends JSON `null` (not omitted) when this field is unset on an
  // existing post_actions row. Use `== null` so both null and undefined
  // are treated as "user has never read the comments."

  if (actions?.read_comments_at == null) return post.comments;
  return post.comments - (actions.read_comments_amount ?? 0);
}

/**
 * v1 records the vote direction as `vote_is_upvote` (boolean) and the time as
 * `voted_at`. Both are independently optional and the wire format returns
 * JSON `null` (not omitted) when unset — because the `*Actions` row also
 * tracks `read_at`/`saved_at`/`hidden_at` and may exist without a vote.
 *
 * Trust `vote_is_upvote` as the direction (matches lemmy-ui's own frontend).
 * Compare with `==` so both `null` and `undefined` count as "no vote" —
 * otherwise the falsy `null` collapses through the ternary to `-1` and the
 * UI reports a phantom downvote on any post the user has merely read or
 * saved.
 */
function toVote(
  actions: LemmyV1.CommentActions | LemmyV1.PostActions | undefined,
): -1 | 1 | undefined {
  if (actions?.vote_is_upvote == null) return undefined;
  return actions.vote_is_upvote ? 1 : -1;
}
