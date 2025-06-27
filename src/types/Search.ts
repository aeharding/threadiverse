import type {
  ListingType,
  PageParams,
  SearchSortType,
  SearchType,
} from "../types";

/**
 * Searches the site, given a query string, and some optional filters.
 */
export type Search = PageParams &
  SearchSortType & {
    community_id?: number;
    community_name?: string;
    creator_id?: number;
    disliked_only?: boolean;
    liked_only?: boolean;
    listing_type?: ListingType;
    post_url_only?: boolean;
    q: string;
    saved_only?: boolean;
    title_only?: boolean;
    type_?: SearchType;
  };
