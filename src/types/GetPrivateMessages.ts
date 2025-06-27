import { PageParams } from "./PageParams";

/**
 * Get your private messages.
 */
export type GetPrivateMessages = PageParams & {
  creator_id?: number;
  unread_only?: boolean;
};
