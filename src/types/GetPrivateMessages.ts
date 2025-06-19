/**
 * Get your private messages.
 */
export type GetPrivateMessages = {
  unread_only?: boolean;
  page?: number;
  limit?: number;
  creator_id?: number;
};
