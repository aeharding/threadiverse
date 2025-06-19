import { CommentReplyView } from "../../types/CommentReplyView";
import { PersonMentionView } from "../../types/PersonMentionView";
import { PrivateMessageView } from "../../types/PrivateMessageView";

export function getInboxItemPublished(
  item: PersonMentionView | CommentReplyView | PrivateMessageView,
): string {
  if ("comment_reply" in item) {
    return item.comment_reply.published;
  }

  if ("private_message" in item) {
    return item.private_message.published;
  }

  return item.person_mention.published;
}
