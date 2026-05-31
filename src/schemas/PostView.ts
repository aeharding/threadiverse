import { z } from "zod/v4-mini";

import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { PostNotificationsMode } from "./PostNotificationsMode";
import { PostTag } from "./PostTag";
import { SubscribedType } from "./SubscribedType";
import { Vote } from "./Vote";

export const PostView = z.object({
  banned_from_community: z.boolean(),
  community: Community,
  creator: Person,
  creator_banned_from_community: z.boolean(),
  creator_blocked: z.boolean(),
  creator_is_admin: z.boolean(),
  creator_is_moderator: z.boolean(),
  hidden: z.boolean(),
  my_vote: z.optional(Vote),
  notifications: PostNotificationsMode,
  post: Post,
  read: z.boolean(),
  /**
   * When the current user last read the comments on this post (ISO 8601).
   * Comments published after this can be treated as unread. Only provided by
   * providers that track it (Lemmy v1); `undefined` otherwise.
   */
  read_comments_at: z.optional(z.string()),
  saved: z.boolean(),
  subscribed: SubscribedType,
  tags: z.array(PostTag),
  unread_comments: z.number(),
});
