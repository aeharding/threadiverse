import { Community, Person, Post } from ".";
import { SubscribedType } from "./SubscribedType";

export interface PostView {
  post: Post;
  creator: Person;
  community: Community;
  creator_banned_from_community: boolean;
  banned_from_community: boolean;
  creator_is_moderator: boolean;
  creator_is_admin: boolean;
  counts: PostAggregates;
  subscribed: SubscribedType;
  saved: boolean;
  read: boolean;
  creator_blocked: boolean;
  my_vote?: number;
  unread_comments: number;
  hidden: boolean;
}

export interface PostAggregates {
  comments: number;
  score: number;
  upvotes: number;
  downvotes: number;
  /**
   * The time of the newest comment in the post.
   */
  newest_comment_time: string;
  published: string;
}
