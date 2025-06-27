import type { ListingType, PageParams } from ".";
import type { CommunitySortType } from "./CommunitySortType";
/**
 * Fetches a list of communities.
 */
export type ListCommunities = CommunitySortType &
  PageParams & {
    show_nsfw?: boolean;
    type_?: ListingType;
  };
