import type { Comment } from "./Comment";
import { CommentReport } from "./CommentReport";
import { CommentAggregates } from "./CommentView";
import type { Community } from "./Community";
import type { Person } from "./Person";
import type { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";
/**
 * A comment report view.
 */
export type CommentReportView = {
  comment_report: CommentReport;
  comment: Comment;
  post: Post;
  community: Community;
  creator: Person;
  comment_creator: Person;
  counts: CommentAggregates;
  creator_banned_from_community: boolean;
  creator_is_moderator: boolean;
  creator_is_admin: boolean;
  creator_blocked: boolean;
  subscribed: SubscribedType;
  saved: boolean;
  my_vote?: number;
  resolver?: Person;
};
