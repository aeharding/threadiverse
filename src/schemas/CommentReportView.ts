import { Comment } from "./Comment";
import { CommentReport } from "./CommentReport";
import { CommentAggregates } from "./CommentView";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";
import { z } from "zod/v4-mini";
import { Vote } from "./Vote";
/**
 * A comment report view.
 */
export const CommentReportView = z.object({
  comment_report: CommentReport,
  comment: Comment,
  post: Post,
  community: Community,
  creator: Person,
  comment_creator: Person,
  counts: CommentAggregates,
  creator_banned_from_community: z.boolean(),
  creator_is_moderator: z.boolean(),
  creator_is_admin: z.boolean(),
  creator_blocked: z.boolean(),
  subscribed: SubscribedType,
  saved: z.boolean(),
  my_vote: z.optional(Vote),
  resolver: z.optional(Person),
});
