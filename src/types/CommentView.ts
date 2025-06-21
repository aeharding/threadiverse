import { Comment } from "./Comment";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";
import { SubscribedType } from "./SubscribedType";

export interface CommentView {
  comment: Comment;
  creator: Person;
  community: Community;
  post: Post;
  counts: CommentAggregates;
  creator_banned_from_community: boolean;
  banned_from_community: boolean;
  creator_is_moderator: boolean;
  creator_is_admin: boolean;
  subscribed: SubscribedType;
  saved: boolean;
  my_vote?: number;
}

export interface CommentAggregates {
  comment_id: number;
  score: number;
  upvotes: number;
  downvotes: number;
  /**
   * The total number of children in this comment branch.
   */
  child_count: number;
  published: string;
}
