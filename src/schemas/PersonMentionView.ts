import { z } from "zod/v4-mini";

import { Comment } from "./Comment";
import { CommentAggregates } from "./CommentView";
import { Community } from "./Community";
import { Person } from "./Person";
import { PersonMention } from "./PersonMention";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";
import { Vote } from "./Vote";

/**
 * A person mention view.
 */
export const PersonMentionView = z.object({
  banned_from_community: z.boolean(),
  comment: Comment,
  community: Community,
  counts: CommentAggregates,
  creator: Person,
  creator_banned_from_community: z.boolean(),
  creator_blocked: z.boolean(),
  creator_is_admin: z.boolean(),
  creator_is_moderator: z.boolean(),
  my_vote: z.optional(Vote),
  person_mention: PersonMention,
  post: Post,
  recipient: Person,
  saved: z.boolean(),
  subscribed: SubscribedType,
});
