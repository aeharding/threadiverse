import { z } from "zod/v4-mini";

/**
 * A listing type for post and comment list fetches.
 */
export const ListingType = z.enum([
  "All",
  "Local",
  "Subscribed",
  "ModeratorView",
]);
