import { z } from "zod/v4-mini";

export const Person = z.object({
  actor_id: z.string(),
  avatar: z.optional(z.string()),
  banner: z.optional(z.string()),
  bio: z.optional(z.string()),
  bot_account: z.boolean(),
  deleted: z.boolean(),
  display_name: z.optional(z.string()),
  id: z.number(),
  local: z.boolean(),
  name: z.string(),
  published: z.string(),
});
