import { z } from "zod/v4-mini";

import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";
import { Vote } from "./Vote";

export const PostAggregates = z.object({
  comments: z.number(),
  downvotes: z.number(),
  /**
   * The time of the newest comment in the post.
   */
  newest_comment_time: z.string(),
  published: z.string(),
  score: z.number(),
  upvotes: z.number(),
});

export const PostView = z.object({
  banned_from_community: z.boolean(),
  community: Community,
  counts: PostAggregates,
  creator: Person,
  creator_banned_from_community: z.boolean(),
  creator_blocked: z.boolean(),
  creator_is_admin: z.boolean(),
  creator_is_moderator: z.boolean(),
  hidden: z.boolean(),
  my_vote: z.optional(Vote),
  post: Post,
  read: z.boolean(),
  saved: z.boolean(),
  subscribed: SubscribedType,
  unread_comments: z.number(),
});
