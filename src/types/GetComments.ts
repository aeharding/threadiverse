import { ListingType } from ".";
import { CommentSortType } from "./CommentSortType";

export type GetComments = CommentSortType & {
  community_id?: number;
  community_name?: string;
  disliked_only?: boolean;
  liked_only?: boolean;
  limit?: number;
  max_depth?: number;
  page?: number;
  parent_id?: number;
  post_id?: number;
  saved_only?: boolean;
  type_?: ListingType;
};
