import { z } from "zod/v4-mini";
import { CommentReplyView } from "./CommentReplyView";
import { PersonMentionView } from "./PersonMentionView";
import { PrivateMessageView } from "./PrivateMessageView";

export const Notification = z.union([
  CommentReplyView,
  PersonMentionView,
  PrivateMessageView,
]);
