import { z } from "zod/v4-mini";

import { CommunityVisibility } from "./CommunityVisibility";

export const Community = z.object({
  /**
   * The federated activity id / ap_id.
   */
  ap_id: z.string(),
  banner: z.optional(z.string()),
  comments: z.number(),
  deleted: z.boolean(),
  icon: z.optional(z.string()),
  id: z.number(),
  local: z.boolean(),
  name: z.string(),
  nsfw: z.boolean(),
  posting_restricted_to_mods: z.boolean(),
  posts: z.number(),
  published_at: z.string(),
  removed: z.boolean(),
  /**
   * Long-form sidebar markdown (replaced v0's `description`).
   */
  sidebar: z.optional(z.string()),
  subscribers: z.number(),
  subscribers_local: z.number(),
  /**
   * Short one-line summary.
   */
  summary: z.optional(z.string()),
  title: z.string(),
  updated_at: z.optional(z.string()),
  users_active_day: z.number(),
  users_active_half_year: z.number(),
  users_active_month: z.number(),
  users_active_week: z.number(),
  visibility: CommunityVisibility,
});
