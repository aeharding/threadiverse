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
    listing_type?: ListingType;
    post_url_only?: boolean;
    q: string;
    title_only?: boolean;
    type_?: SearchType;
  };
