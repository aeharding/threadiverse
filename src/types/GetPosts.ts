import { ListingType } from ".";
import { PostSortType } from "./PostSortType";

export type GetPosts = PostSortType & {
  community_id?: number;
  community_name?: string;
  disliked_only?: boolean;
  liked_only?: boolean;
  limit?: number;
  page_cursor?: string;
  saved_only?: boolean;
  show_hidden?: boolean;
  /**
   * If true, then show the nsfw posts (even if your user setting is to hide them)
   */
  show_nsfw?: boolean;
  /**
   * If true, then show the read posts (even if your user setting is to hide them)
   */
  show_read?: boolean;

  type_?: ListingType;
};
