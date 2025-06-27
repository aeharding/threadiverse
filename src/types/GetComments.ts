import { ListingType, PageParams } from ".";
import { CommentSortType } from "./CommentSortType";

export type GetComments = CommentSortType &
  PageParams & {
    community_id?: number;
    community_name?: string;
    disliked_only?: boolean;
    liked_only?: boolean;
    max_depth?: number;
    parent_id?: number;
    post_id?: number;
    saved_only?: boolean;
    type_?: ListingType;
  };
