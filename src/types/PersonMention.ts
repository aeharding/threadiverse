/**
 * A person mention.
 */
export type PersonMention = {
  id: number;
  recipient_id: number;
  comment_id: number;
  read: boolean;
  published: string;
};
