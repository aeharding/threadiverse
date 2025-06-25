import type { ListingType } from ".";
import type { CommunitySortType } from "./CommunitySortType";
/**
 * Fetches a list of communities.
 */
export type ListCommunities = CommunitySortType & {
  limit?: number;
  page?: number;
  show_nsfw?: boolean;
  type_?: ListingType;
};
