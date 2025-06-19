import { CommentView } from "./CommentView";
import { CommunityView } from "./CommunityView";
import { PersonView } from "./PersonView";
import { PostView } from "./PostView";

export interface ResolveObjectResponse {
  comment?: CommentView;
  post?: PostView;
  community?: CommunityView;
  person?: PersonView;
}
