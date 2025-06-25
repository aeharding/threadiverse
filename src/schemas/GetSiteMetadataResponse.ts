import { z } from "zod/v4-mini";

/**
 * Site metadata, from its opengraph tags.
 */
export const LinkMetadata = z.object({
  content_type: z.optional(z.string()),
  title: z.optional(z.string()),
  description: z.optional(z.string()),
  image: z.optional(z.string()),
  embed_video_url: z.optional(z.string()),
});

/**
 * The site metadata response.
 */
export const GetSiteMetadataResponse = z.object({
  metadata: LinkMetadata,
});
