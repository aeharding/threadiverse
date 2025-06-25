import { z } from "zod/v4-mini";

export const Comment = z.object({
  /**
   * The federated activity id / ap_id.
   */
  ap_id: z.string(),
  content: z.string(),
  creator_id: z.number(),
  /**
   * Whether the comment has been deleted by its creator.
   */
  deleted: z.boolean(),
  /**
   * Whether the comment has been distinguished(speaking officially) by a mod.
   */
  distinguished: z.boolean(),
  id: z.number(),
  language_id: z.number(),
  /**
   * Whether the comment is local.
   */
  local: z.boolean(),
  /**
   * The path / tree location of a comment, separated by dots, ending with the comment's id. Ex:
   * 0.24.27
   */
  path: z.string(),
  post_id: z.number(),
  published: z.string(),
  /**
   * Whether the comment has been removed.
   */
  removed: z.boolean(),
  updated: z.optional(z.string()),
});
