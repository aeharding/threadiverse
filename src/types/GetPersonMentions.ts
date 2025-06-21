/**
 * Get mentions for your user.
 */
export type GetPersonMentions = {
  page?: number;
  limit?: number;
  unread_only?: boolean;
};
