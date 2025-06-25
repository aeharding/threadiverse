import { z } from "zod/v4-mini";

/**
 * A private message.
 */
export const PrivateMessage = z.object({
  id: z.number(),
  creator_id: z.number(),
  recipient_id: z.number(),
  content: z.string(),
  deleted: z.boolean(),
  read: z.boolean(),
  published: z.string(),
  updated: z.optional(z.string()),
  ap_id: z.string(),
  local: z.boolean(),
});
