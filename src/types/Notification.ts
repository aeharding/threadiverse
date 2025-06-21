import { CommentReplyView } from "./CommentReplyView";
import { PersonMentionView } from "./PersonMentionView";
import { PrivateMessageView } from "./PrivateMessageView";

export type Notification =
  | CommentReplyView
  | PersonMentionView
  | PrivateMessageView;
