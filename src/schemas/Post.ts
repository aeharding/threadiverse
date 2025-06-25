import { z } from "zod/v4-mini";

export const Post = z.object({
  /**
   * An optional alt_text, usable for image posts.
   */
  alt_text: z.optional(z.string()),
  /**
   * The federated activity id / ap_id.
   */
  ap_id: z.string(),
  /**
   * An optional post body, in markdown.
   */
  body: z.optional(z.string()),
  community_id: z.number(),
  creator_id: z.number(),
  /**
   * Whether the post is deleted.
   */
  deleted: z.boolean(),
  /**
   * A description for the link.
   */
  embed_description: z.optional(z.string()),
  /**
   * A title for the link.
   */
  embed_title: z.optional(z.string()),
  /**
   * Whether the post is featured to its community.
   */
  featured_community: z.boolean(),
  /**
   * Whether the post is featured to its site.
   */
  featured_local: z.boolean(),
  id: z.number(),
  language_id: z.number(),
  /**
   * Whether the post is local.
   */
  local: z.boolean(),
  /**
   * Whether the post is locked.
   */
  locked: z.boolean(),
  name: z.string(),
  /**
   * Whether the post is NSFW.
   */
  nsfw: z.boolean(),
  published: z.string(),

  /**
   * Whether the post is removed.
   */
  removed: z.boolean(),
  /**
   * A thumbnail picture url.
   */
  thumbnail_url: z.optional(z.string()),
  updated: z.optional(z.string()),
  /**
   * An optional link / url for the post.
   */
  url: z.optional(z.string()),
  url_content_type: z.optional(z.string()),
});
