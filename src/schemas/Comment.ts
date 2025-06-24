import { z } from "zod/v4-mini";

export const Comment = z.object({
  id: z.number(),
  creator_id: z.number(),
  post_id: z.number(),
  content: z.string(),
  /**
   * Whether the comment has been removed.
   */
  removed: z.boolean(),
  published: z.string(),
  updated: z.optional(z.string()),
  /**
   * Whether the comment has been deleted by its creator.
   */
  deleted: z.boolean(),
  /**
   * The federated activity id / ap_id.
   */
  ap_id: z.string(),
  /**
   * Whether the comment is local.
   */
  local: z.boolean(),
  /**
   * The path / tree location of a comment, separated by dots, ending with the comment's id. Ex:
   * 0.24.27
   */
  path: z.string(),
  /**
   * Whether the comment has been distinguished(speaking officially) by a mod.
   */
  distinguished: z.boolean(),
  language_id: z.number(),
});
