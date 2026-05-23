import { z } from "zod/v4-mini";

import { Comment } from "./Comment";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";
import { Vote } from "./Vote";

export const CommentView = z.object({
  banned_from_community: z.boolean(),
  comment: Comment,
  community: Community,
  creator: Person,
  creator_banned_from_community: z.boolean(),
  creator_is_admin: z.boolean(),
  creator_is_moderator: z.boolean(),
  my_vote: z.optional(Vote),
  post: Post,
  saved: z.boolean(),
  subscribed: SubscribedType,
});
