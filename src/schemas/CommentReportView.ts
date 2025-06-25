import { z } from "zod/v4-mini";

import { Comment } from "./Comment";
import { CommentReport } from "./CommentReport";
import { CommentAggregates } from "./CommentView";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";
import { Vote } from "./Vote";
/**
 * A comment report view.
 */
export const CommentReportView = z.object({
  comment: Comment,
  comment_creator: Person,
  comment_report: CommentReport,
  community: Community,
  counts: CommentAggregates,
  creator: Person,
  creator_banned_from_community: z.boolean(),
  creator_blocked: z.boolean(),
  creator_is_admin: z.boolean(),
  creator_is_moderator: z.boolean(),
  my_vote: z.optional(Vote),
  post: Post,
  resolver: z.optional(Person),
  saved: z.boolean(),
  subscribed: SubscribedType,
});
