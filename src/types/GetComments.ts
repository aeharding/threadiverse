import { CommentSortType } from "./CommentSortType";
import { ListingType } from "./ListingType";

export type GetComments = CommentSortType & {
  type_?: ListingType;
  max_depth?: number;
  page?: number;
  limit?: number;
  community_id?: number;
  community_name?: string;
  post_id?: number;
  parent_id?: number;
  saved_only?: boolean;
  liked_only?: boolean;
  disliked_only?: boolean;
};
