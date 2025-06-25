import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";
import { z } from "zod/v4-mini";
import { Vote } from "./Vote";

export const PostAggregates = z.object({
  comments: z.number(),
  score: z.number(),
  upvotes: z.number(),
  downvotes: z.number(),
  /**
   * The time of the newest comment in the post.
   */
  newest_comment_time: z.string(),
  published: z.string(),
});

export const PostView = z.object({
  post: Post,
  creator: Person,
  community: Community,
  creator_banned_from_community: z.boolean(),
  banned_from_community: z.boolean(),
  creator_is_moderator: z.boolean(),
  creator_is_admin: z.boolean(),
  counts: PostAggregates,
  subscribed: SubscribedType,
  saved: z.boolean(),
  read: z.boolean(),
  creator_blocked: z.boolean(),
  my_vote: z.optional(Vote),
  unread_comments: z.number(),
  hidden: z.boolean(),
});
