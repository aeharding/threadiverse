import type { CommentSortType } from "./CommentSortType";

/**
 * Get mentions for your user.
 */
export type GetPersonMentions = {
  sort?: CommentSortType;
  page?: number;
  limit?: number;
  unread_only?: boolean;
};
