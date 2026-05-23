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
  comments: z.number(),
  community_id: z.number(),
  creator_id: z.number(),
  /**
   * Whether the post is deleted.
   */
  deleted: z.boolean(),
  downvotes: z.number(),
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
   * The time of the newest comment in the post.
   */
  newest_comment_time_at: z.optional(z.string()),
  /**
   * Whether the post is NSFW.
   */
  nsfw: z.boolean(),
  published_at: z.string(),
  /**
   * Whether the post is removed.
   */
  removed: z.boolean(),
  score: z.number(),
  /**
   * A thumbnail picture url.
   */
  thumbnail_url: z.optional(z.string()),
  updated_at: z.optional(z.string()),
  upvotes: z.number(),
  /**
   * An optional link / url for the post.
   */
  url: z.optional(z.string()),
  url_content_type: z.optional(z.string()),
});
