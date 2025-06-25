import { z } from "zod/v4-mini";

/**
 * A type / status for a community subscribe.
 */
export const SubscribedType = z.enum([
  "Subscribed",
  "NotSubscribed",
  "Pending",
  "ApprovalRequired",
]);
