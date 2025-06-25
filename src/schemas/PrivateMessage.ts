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
  published: z.string(),
  read: z.boolean(),
  recipient_id: z.number(),
  updated: z.optional(z.string()),
});
