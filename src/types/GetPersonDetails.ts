import type { PostSortType } from "./PostSortType";

/**
 * Gets a person's details.
 *
 * Either person_id, or username are required.
 */
export type GetPersonDetails = {
  person_id?: number;
  /**
   * Example: dessalines , or dessalines@xyz.tld
   */
  username?: string;
  sort?: PostSortType;
  page?: number;
  limit?: number;
  community_id?: number;
  saved_only?: boolean;
};
