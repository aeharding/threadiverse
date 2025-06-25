import { z } from "zod/v4-mini";

/**
 * A person mention.
 */
export const PersonMention = z.object({
  comment_id: z.number(),
  id: z.number(),
  published: z.string(),
  read: z.boolean(),
  recipient_id: z.number(),
});
