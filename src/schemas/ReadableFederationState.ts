import { z } from "zod/v4-mini";

export const ReadableFederationState = z.object({
  /**
   * timestamp of the next retry attempt (null if fail count is 0)
   */
  next_retry: z.optional(z.string()),
  instance_id: z.number(),
  /**
   * the last successfully sent activity id
   */
  last_successful_id: z.optional(z.number()),
  last_successful_published_time: z.optional(z.string()),
  /**
   * how many failed attempts have been made to send the next activity
   */
  fail_count: z.number(),
  /**
   * timestamp of the last retry attempt (when the last failing activity was resent)
   */
  last_retry: z.optional(z.string()),
});
