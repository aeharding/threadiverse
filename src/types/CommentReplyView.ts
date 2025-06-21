import { Comment } from "./Comment";
import { CommentReply } from "./CommentReply";
import { CommentAggregates } from "./CommentView";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";

/**
 * A comment reply view.
 */
export interface CommentReplyView {
  comment_reply: CommentReply;
  comment: Comment;
  creator: Person;
  post: Post;
  community: Community;
  recipient: Person;
  counts: CommentAggregates;
  creator_banned_from_community: boolean;
  banned_from_community: boolean;
  creator_is_moderator: boolean;
  creator_is_admin: boolean;
  subscribed: SubscribedType;
  saved: boolean;
  creator_blocked: boolean;
  my_vote?: number;
}
