/**
 * A post report.
 */
export type PostReport = {
  id: number;
  creator_id: number;
  post_id: number;
  /**
   * The original post title.
   */
  original_post_name: string;
  /**
   * The original post url.
   */
  original_post_url?: string;
  /**
   * The original post body.
   */
  original_post_body?: string;
  reason: string;
  resolved: boolean;
  resolver_id?: number;
  published: string;
  updated?: string;
};
