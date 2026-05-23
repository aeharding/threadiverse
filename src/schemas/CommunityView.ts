import { z } from "zod/v4-mini";

import { Community } from "./Community";
import { SubscribedType } from "./SubscribedType";

export const CommunityView = z.object({
  blocked: z.boolean(),
  community: Community,
  subscribed: SubscribedType,
});
