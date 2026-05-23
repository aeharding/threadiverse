import { z } from "zod/v4-mini";

/**
 * A private message.
 */
export const PrivateMessage = z.object({
  ap_id: z.string(),
  content: z.string(),
  creator_id: z.number(),
  deleted: z.boolean(),
  id: z.number(),
  local: z.boolean(),
  published_at: z.string(),
  recipient_id: z.number(),
  updated_at: z.optional(z.string()),
});
