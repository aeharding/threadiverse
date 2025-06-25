import { Comment } from "./Comment";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";
import { z } from "zod/v4-mini";
import { Vote } from "./Vote";

export const CommentAggregates = z.object({
  comment_id: z.number(),
  score: z.number(),
  upvotes: z.number(),
  downvotes: z.number(),
  /**
   * The total number of children in this comment branch.
   */
  child_count: z.number(),
  published: z.string(),
});

export const CommentView = z.object({
  comment: Comment,
  creator: Person,
  community: Community,
  post: Post,
  counts: CommentAggregates,
  creator_banned_from_community: z.boolean(),
  banned_from_community: z.boolean(),
  creator_is_moderator: z.boolean(),
  creator_is_admin: z.boolean(),
  subscribed: SubscribedType,
  saved: z.boolean(),
  my_vote: z.optional(Vote),
});
