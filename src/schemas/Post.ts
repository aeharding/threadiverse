import { z } from "zod/v4-mini";

export const Post = z.object({
  id: z.number(),
  name: z.string(),
  /**
   * An optional link / url for the post.
   */
  url: z.optional(z.string()),
  /**
   * An optional post body, in markdown.
   */
  body: z.optional(z.string()),
  creator_id: z.number(),
  community_id: z.number(),
  /**
   * Whether the post is removed.
   */
  removed: z.boolean(),
  /**
   * Whether the post is locked.
   */
  locked: z.boolean(),
  published: z.string(),
  updated: z.optional(z.string()),
  /**
   * Whether the post is deleted.
   */
  deleted: z.boolean(),
  /**
   * Whether the post is NSFW.
   */
  nsfw: z.boolean(),
  /**
   * A title for the link.
   */
  embed_title: z.optional(z.string()),
  /**
   * A description for the link.
   */
  embed_description: z.optional(z.string()),
  /**
   * A thumbnail picture url.
   */
  thumbnail_url: z.optional(z.string()),
  /**
   * The federated activity id / ap_id.
   */
  ap_id: z.string(),
  /**
   * Whether the post is local.
   */
  local: z.boolean(),

  language_id: z.number(),
  /**
   * Whether the post is featured to its community.
   */
  featured_community: z.boolean(),
  /**
   * Whether the post is featured to its site.
   */
  featured_local: z.boolean(),
  url_content_type: z.optional(z.string()),
  /**
   * An optional alt_text, usable for image posts.
   */
  alt_text: z.optional(z.string()),
});
