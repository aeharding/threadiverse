export interface EditPost {
  /**
   * An optional alt_text, usable for image posts.
   */
  alt_text?: string;
  /**
   * An optional body for the post in markdown.
   */
  body?: string;
  /**
   * Instead of fetching a thumbnail, use a custom one.
   */
  custom_thumbnail?: string;
  language_id?: number;
  name?: string;
  nsfw?: boolean;
  post_id: number;
  url?: string;
}
