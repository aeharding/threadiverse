import { z } from "zod/v4-mini";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { PostReport } from "./PostReport";
import { PostAggregates } from "./PostView";
import { SubscribedType } from "./SubscribedType";
import { Vote } from "./Vote";

/**
 * A post report view.
 */
export const PostReportView = z.object({
  post_report: PostReport,
  post: Post,
  community: Community,
  creator: Person,
  post_creator: Person,
  creator_banned_from_community: z.boolean(),
  creator_is_moderator: z.boolean(),
  creator_is_admin: z.boolean(),
  subscribed: SubscribedType,
  saved: z.boolean(),
  read: z.boolean(),
  hidden: z.boolean(),
  creator_blocked: z.boolean(),
  my_vote: z.optional(Vote),
  unread_comments: z.number(),
  counts: PostAggregates,
  resolver: z.optional(Person),
});
