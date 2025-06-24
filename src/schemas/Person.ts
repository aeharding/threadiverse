import { z } from "zod/v4-mini";

export const Person = z.object({
  id: z.number(),
  name: z.string(),
  display_name: z.optional(z.string()),
  avatar: z.optional(z.string()),
  actor_id: z.string(),
  published: z.string(),
  local: z.boolean(),
  deleted: z.boolean(),
  bot_account: z.boolean(),
});
