import { z } from "zod/v4-mini";

import { CommunityVisibility } from "./CommunityVisibility";

export const Community = z.object({
  actor_id: z.string(),
  banner: z.optional(z.string()),
  deleted: z.boolean(),
  description: z.optional(z.string()),
  hidden: z.boolean(),
  icon: z.optional(z.string()),
  id: z.number(),
  local: z.boolean(),
  name: z.string(),
  nsfw: z.boolean(),
  posting_restricted_to_mods: z.boolean(),
  published: z.string(),
  removed: z.boolean(),
  title: z.string(),
  updated: z.optional(z.string()),
  visibility: CommunityVisibility,
});
