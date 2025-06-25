import { z } from "zod/v4-mini";

import { Comment } from "./Comment";
import { CommentReply } from "./CommentReply";
import { CommentAggregates } from "./CommentView";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";
import { Vote } from "./Vote";

/**
 * A comment reply view.
 */
export const CommentReplyView = z.object({
  banned_from_community: z.boolean(),
  comment: Comment,
  comment_reply: CommentReply,
  community: Community,
  counts: CommentAggregates,
  creator: Person,
  creator_banned_from_community: z.boolean(),
  creator_blocked: z.boolean(),
  creator_is_admin: z.boolean(),
  creator_is_moderator: z.boolean(),
  my_vote: z.optional(Vote),
  post: Post,
  recipient: Person,
  saved: z.boolean(),
  subscribed: SubscribedType,
});
