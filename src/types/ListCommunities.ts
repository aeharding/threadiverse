import type { CommunitySortType } from "./CommunitySortType";
import type { ListingType } from "./ListingType";
/**
 * Fetches a list of communities.
 */
export type ListCommunities = CommunitySortType & {
  type_?: ListingType;
  show_nsfw?: boolean;
  page?: number;
  limit?: number;
};
