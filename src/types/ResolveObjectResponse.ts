import { CommentView } from "./CommentView";
import { CommunityView } from "./CommunityView";
import { Person } from "./Person";
import { PostView } from "./PostView";

export interface ResolveObjectResponse {
  comment?: CommentView;
  post?: PostView;
  community?: CommunityView;
  person?: PersonView;
}
