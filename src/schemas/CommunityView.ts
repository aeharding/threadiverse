import { z } from "zod/v4-mini";

import { Community } from "./Community";
import { CommunityAggregates } from "./CommunityAggregates";
import { SubscribedType } from "./SubscribedType";

export const CommunityView = z.object({
  blocked: z.boolean(),
  community: Community,
  counts: CommunityAggregates,
  subscribed: SubscribedType,
});
