import { CommentAggregates } from "./CommentView";
import { Community } from "./Community";
import { Comment } from "./Comment";
import { Person } from "./Person";
import { PersonMention } from "./PersonMention";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";
import { z } from "zod/v4-mini";
import { Vote } from "./Vote";

/**
 * A person mention view.
 */
export const PersonMentionView = z.object({
  person_mention: PersonMention,
  comment: Comment,
  creator: Person,
  post: Post,
  community: Community,
  recipient: Person,
  counts: CommentAggregates,
  creator_banned_from_community: z.boolean(),
  banned_from_community: z.boolean(),
  creator_is_moderator: z.boolean(),
  creator_is_admin: z.boolean(),
  subscribed: SubscribedType,
  saved: z.boolean(),
  creator_blocked: z.boolean(),
  my_vote: z.optional(Vote),
});
