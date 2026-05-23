import { z } from "zod/v4-mini";

/**
 * A listing type for post and comment list fetches.
 */
export const ListingType = z.enum([
  "all",
  "local",
  "subscribed",
  "moderator_view",
]);
