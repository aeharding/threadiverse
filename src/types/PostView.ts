import { PostAggregates } from "lemmy-js-client";

import { Community, Person, Post } from ".";

export interface PostView {
  post: Post;
  creator: Person;
  community: Community;
  creator_banned_from_community: boolean;
  counts: PostAggregates;
  subscribed: boolean;
  saved: boolean;
  read: boolean;
  creator_blocked: boolean;
  my_vote?: number;
  unread_comments: number;
}

export interface PostAggregates extends PostAggregates {
  comments: number;
  score: number;
  upvotes: number;
  downvotes: number;
  /**
   * The time of the newest comment in the post.
   */
  newest_comment_time: string;
}
