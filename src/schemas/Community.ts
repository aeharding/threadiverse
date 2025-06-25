import { z } from "zod/v4-mini";
import { CommunityVisibility } from "./CommunityVisibility";

export const Community = z.object({
  id: z.number(),
  name: z.string(),
  title: z.string(),
  description: z.optional(z.string()),
  removed: z.boolean(),
  published: z.string(),
  updated: z.optional(z.string()),
  deleted: z.boolean(),
  nsfw: z.boolean(),
  actor_id: z.string(),
  local: z.boolean(),
  icon: z.optional(z.string()),
  banner: z.optional(z.string()),
  hidden: z.boolean(),
  posting_restricted_to_mods: z.boolean(),
  visibility: CommunityVisibility,
});
