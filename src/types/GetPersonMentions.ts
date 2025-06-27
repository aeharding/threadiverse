import { PageParams } from "./PageParams";

/**
 * Get mentions for your user.
 */
export type GetPersonMentions = PageParams & {
  unread_only?: boolean;
};
