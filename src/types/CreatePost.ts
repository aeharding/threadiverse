export interface CreatePost {
  /**
   * An optional alt_text, usable for image posts.
   */
  alt_text?: string;
  /**
   * An optional body for the post in markdown.
   */
  body?: string;
  community_id: number;
  /**
   * Instead of fetching a thumbnail, use a custom one.
   */
  custom_thumbnail?: string;
  language_id?: number;
  name: string;
  nsfw?: boolean;
  url?: string;
}
