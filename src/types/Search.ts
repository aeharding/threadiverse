import type { ListingType, SearchSortType, SearchType } from "../types";

/**
 * Searches the site, given a query string, and some optional filters.
 */
export type Search = SearchSortType & {
  community_id?: number;
  community_name?: string;
  creator_id?: number;
  disliked_only?: boolean;
  liked_only?: boolean;
  limit?: number;
  listing_type?: ListingType;
  page?: number;
  post_url_only?: boolean;
  q: string;
  saved_only?: boolean;
  title_only?: boolean;
  type_?: SearchType;
};
