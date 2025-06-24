import { Community } from "./Community";
import { CommunityAggregates } from "./CommunityAggregates";
import { SubscribedType } from "./SubscribedType";
import { z } from "zod/v4-mini";

export const CommunityView = z.object({
  community: Community,
  subscribed: SubscribedType,
  blocked: z.boolean(),
  counts: CommunityAggregates,
});
