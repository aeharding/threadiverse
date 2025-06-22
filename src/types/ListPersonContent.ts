/**
 * Gets a person's content (posts and comments)
 *
 * Either person_id, or username are required.
 */
export type ListPersonContent = {
  person_id?: number;
  page_cursor?: string;
  page_back?: boolean;
  limit?: number;
};
