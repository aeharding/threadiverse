import { z } from "zod/v4-mini";

/**
 * A person mention.
 */
export const PersonMention = z.object({
  id: z.number(),
  recipient_id: z.number(),
  comment_id: z.number(),
  read: z.boolean(),
  published: z.string(),
});
