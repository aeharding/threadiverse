import { PageParams } from "./PageParams";

/**
 * Gets a person's content (posts and comments)
 *
 * Either person_id, or username are required.
 */
export type ListPersonContent = PageParams & {
  page_back?: boolean;
  person_id?: number;
  type?: "All" | "Comments" | "Posts";
};
