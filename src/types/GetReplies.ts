import { PageParams } from "./PageParams";

/**
 * Get comment replies.
 */
export type GetReplies = PageParams & {
  unread_only?: boolean;
};
