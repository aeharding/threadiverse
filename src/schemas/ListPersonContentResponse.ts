import { z } from "zod/v4-mini";
import { CommentView } from "./CommentView";
import { PostView } from "./PostView";

/**
 * A person's content response.
 */
export const ListPersonContentResponse = z.object({
  content: z.array(z.union([PostView, CommentView])),
  /**
   * the pagination cursor to use to fetch the next page
   */
  next_page: z.optional(z.string()),
  prev_page: z.optional(z.string()),
});
