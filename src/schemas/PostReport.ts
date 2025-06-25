import { z } from "zod/v4-mini";

/**
 * A post report.
 */
export const PostReport = z.object({
  id: z.number(),
  creator_id: z.number(),
  post_id: z.number(),
  /**
   * The original post title.
   */
  original_post_name: z.string(),
  /**
   * The original post url.
   */
  original_post_url: z.optional(z.string()),
  /**
   * The original post body.
   */
  original_post_body: z.optional(z.string()),
  reason: z.string(),
  resolved: z.boolean(),
  resolver_id: z.optional(z.number()),
  published: z.string(),
  updated: z.optional(z.string()),
});
