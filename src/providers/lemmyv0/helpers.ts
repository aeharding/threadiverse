import {
  CommentReplyView,
  CommentReportView,
  CommentView,
  GetModlogResponse,
  PersonMentionView,
  PostReportView,
  PostView,
  PrivateMessageView,
} from "../../types";

export function getInboxItemPublished(
  item: CommentReplyView | PersonMentionView | PrivateMessageView,
): string {
  if ("comment_reply" in item) {
    return item.comment_reply.published;
  }

  if ("private_message" in item) {
    return item.private_message.published;
  }

  return item.person_mention.published;
}

export function getLogDate(item: GetModlogResponse["modlog"][number]): string {
  switch (true) {
    case "mod_remove_comment" in item:
      return item.mod_remove_comment.when_;
    case "mod_remove_post" in item:
      return item.mod_remove_post.when_;
    case "mod_lock_post" in item:
      return item.mod_lock_post.when_;
    case "mod_feature_post" in item:
      return item.mod_feature_post.when_;
    case "mod_remove_community" in item:
      return item.mod_remove_community.when_;
    case "mod_ban_from_community" in item:
      return item.mod_ban_from_community.when_;
    case "mod_ban" in item:
      return item.mod_ban.when_;
    case "mod_add_community" in item:
      return item.mod_add_community.when_;
    case "mod_transfer_community" in item:
      return item.mod_transfer_community.when_;
    case "mod_add" in item:
      return item.mod_add.when_;
    case "admin_purge_person" in item:
      return item.admin_purge_person.when_;
    case "admin_purge_community" in item:
      return item.admin_purge_community.when_;
    case "admin_purge_post" in item:
      return item.admin_purge_post.when_;
    case "admin_purge_comment" in item:
      return item.admin_purge_comment.when_;
    case "mod_hide_community" in item:
      return item.mod_hide_community.when_;
    default:
      // should never happen (type = never)
      //
      // If item is not type = never, then some mod log action was added
      // and needs to be handled.
      return item;
  }
}

export function getPostCommentItemCreatedDate(
  item: CommentReportView | CommentView | PostReportView | PostView,
): number {
  if ("comment" in item) return Date.parse(item.comment.published);
  return Date.parse(item.post.published);
}
