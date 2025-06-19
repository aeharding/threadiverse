import type { CommentView } from "./CommentView";
import type { CommunityModeratorView } from "./CommunityModeratorView";
import type { PersonView } from "./PersonView";
import type { PostView } from "./PostView";
/**
 * A person's details response.
 */
export type GetPersonDetailsResponse = {
  person_view: PersonView;
  // site?: Site;
  comments: Array<CommentView>;
  posts: Array<PostView>;
  moderates: Array<CommunityModeratorView>;
};
