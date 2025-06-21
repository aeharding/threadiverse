import type { CommentSortType } from "./CommentSortType";
/**
 * Get comment replies.
 */
export type GetReplies = {
  sort?: CommentSortType;
  page?: number;
  limit?: number;
  unread_only?: boolean;
};
