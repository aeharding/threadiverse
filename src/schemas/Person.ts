import { z } from "zod/v4-mini";

export const Person = z.object({
  /**
   * The federated activity id / ap_id.
   */
  ap_id: z.string(),
  avatar: z.optional(z.string()),
  bot_account: z.boolean(),
  comment_count: z.number(),
  deleted: z.boolean(),
  display_name: z.optional(z.string()),
  id: z.number(),
  local: z.boolean(),
  name: z.string(),
  post_count: z.number(),
  published_at: z.string(),
});
