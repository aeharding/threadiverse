/**
 * A comment report.
 */
export type CommentReport = {
  id: number;
  creator_id: number;
  comment_id: number;
  original_comment_text: string;
  reason: string;
  resolved: boolean;
  resolver_id?: number;
  published: string;
  updated?: string;
};
