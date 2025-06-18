import { Community } from "./Community";
import { CommunityAggregates } from "./CommunityAggregates";

export interface CommunityView {
  community: Community;
  subscribed: boolean;
  blocked: boolean;
  counts: CommunityAggregates;
}
