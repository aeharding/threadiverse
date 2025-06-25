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
  post_creator: Person,
  post_report: PostReport,
  read: z.boolean(),
  resolver: z.optional(Person),
  saved: z.boolean(),
  subscribed: SubscribedType,
  unread_comments: z.number(),
});
