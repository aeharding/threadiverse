import { z } from "zod/v4-mini";

/**
 * A comment report.
 */
export const CommentReport = z.object({
  comment_id: z.number(),
  creator_id: z.number(),
  id: z.number(),
  original_comment_text: z.string(),
  published: z.string(),
  reason: z.string(),
  resolved: z.boolean(),
  resolver_id: z.optional(z.number()),
  updated: z.optional(z.string()),
});
