import { Community } from "./Community";
import { CommunityAggregates } from "./CommunityAggregates";
import { SubscribedType } from "./SubscribedType";

export interface CommunityView {
  community: Community;
  subscribed: SubscribedType;
  blocked: boolean;
  counts: CommunityAggregates;
}
