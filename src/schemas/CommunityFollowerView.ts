import { z } from "zod/v4-mini";

import { Community } from "./Community";
import { Person } from "./Person";

export const CommunityFollowerView = z.object({
  community: Community,
  follower: Person,
});
