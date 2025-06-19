/**
 * A comment reply.
 */
export interface CommentReply {
  id: number;
  recipient_id: number;
  comment_id: number;
  read: boolean;
  published: string;
}
