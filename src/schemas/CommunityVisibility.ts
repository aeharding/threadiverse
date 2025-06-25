import { z } from "zod/v4-mini";

/**
 * Defines who can browse and interact with content in a community.
 */
export const CommunityVisibility = z.enum([
  "Public",
  "Unlisted",
  "LocalOnlyPublic",
  "LocalOnlyPrivate",
  "Private",
]);
