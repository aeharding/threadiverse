import { CommentView } from "./CommentView";
import { PostView } from "./PostView";

/**
 * A person's content response.
 */
export type ListPersonContentResponse = {
  content: Array<PostView | CommentView>;
  /**
   * the pagination cursor to use to fetch the next page
   */
  next_page?: string;
  prev_page?: string;
};
