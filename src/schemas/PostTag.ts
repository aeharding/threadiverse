import { z } from "zod/v4-mini";

/**
 * A tag attached to a post.
 *
 * - Lemmy v1: maps from `CommunityTag` (mod-curated, palette color slot like
 *   `"color03"`).
 * - PieFed: maps from `CommunityFlair` applied to the post (hex `color`
 *   like `"#a91b9c"`).
 * - Lemmy v0: not supported (empty array).
 *
 * `color` is opaque to threadiverse — consumers either render it directly
 * (hex) or look it up in a palette (Lemmy v1 slot keys).
 */
export const PostTag = z.object({
  color: z.optional(z.string()),
  display_name: z.optional(z.string()),
  name: z.string(),
});
