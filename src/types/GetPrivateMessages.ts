/**
 * Get your private messages.
 */
export type GetPrivateMessages = {
  creator_id?: number;
  limit?: number;
  page?: number;
  unread_only?: boolean;
};
