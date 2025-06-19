import { Comment } from "./Comment";
import { CommentAggregates } from "./CommentView";
import { Community } from "./Community";
import { Person } from "./Person";
import { PersonMention } from "./PersonMention";
import { Post } from "./Post";

/**
 * A person mention view.
 */
export interface PersonMentionView {
  person_mention: PersonMention;
  comment: Comment;
  creator: Person;
  post: Post;
  community: Community;
  recipient: Person;
  counts: CommentAggregates;
  creator_banned_from_community: boolean;
  banned_from_community: boolean;
  creator_is_moderator: boolean;
  creator_is_admin: boolean;
  subscribed: boolean;
  saved: boolean;
  creator_blocked: boolean;
  my_vote?: number;
}
