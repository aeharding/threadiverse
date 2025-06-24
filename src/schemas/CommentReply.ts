import { z } from "zod/v4-mini";

/**
 * A comment reply.
 */
export const CommentReply = z.object({
  id: z.number(),
  recipient_id: z.number(),
  comment_id: z.number(),
  read: z.boolean(),
  published: z.string(),
});
