import type { CommunitySortType } from "./CommunitySortType";
import type { ListingType } from "./ListingType";
/**
 * Fetches a list of communities.
 */
export type ListCommunities = {
  type_?: ListingType;
  sort?: CommunitySortType;
  show_nsfw?: boolean;
  page?: number;
  limit?: number;
};
