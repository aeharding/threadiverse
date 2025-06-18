import { CommunityModeratorView } from "./CommunityModeratorView";
import { CommunityView } from "./CommunityView";

export interface GetCommunityResponse {
  community_view: CommunityView;
  moderators: Array<CommunityModeratorView>;
}
