import { z } from "zod/v4-mini";

/**
 * A comment report.
 */
export const CommentReport = z.object({
  id: z.number(),
  creator_id: z.number(),
  comment_id: z.number(),
  original_comment_text: z.string(),
  reason: z.string(),
  resolved: z.boolean(),
  resolver_id: z.optional(z.number()),
  published: z.string(),
  updated: z.optional(z.string()),
});
