/**
 * The site metadata response.
 */
export interface GetSiteMetadataResponse {
  metadata: LinkMetadata;
}

/**
 * Site metadata, from its opengraph tags.
 */
export interface LinkMetadata {
  content_type?: string;
  title?: string;
  description?: string;
  image?: string;
  embed_video_url?: string;
}
