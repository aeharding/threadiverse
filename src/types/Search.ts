import type { ListingType } from "./ListingType";
import { SearchSortType } from "./SearchSortType";
import type { SearchType } from "./SearchType";

/**
 * Searches the site, given a query string, and some optional filters.
 */
export type Search = SearchSortType & {
  q: string;
  community_id?: number;
  community_name?: string;
  creator_id?: number;
  type_?: SearchType;
  listing_type?: ListingType;
  page?: number;
  limit?: number;
  title_only?: boolean;
  post_url_only?: boolean;
  saved_only?: boolean;
  liked_only?: boolean;
  disliked_only?: boolean;
};
