export interface CreateComment {
  content: string;
  language_id?: number;
  parent_id?: number;
  post_id: number;
}
