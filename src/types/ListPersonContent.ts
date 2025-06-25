/**
 * Gets a person's content (posts and comments)
 *
 * Either person_id, or username are required.
 */
export type ListPersonContent = {
  limit?: number;
  page_back?: boolean;
  page_cursor?: string;
  person_id?: number;
  type?: "All" | "Comments" | "Posts";
};
