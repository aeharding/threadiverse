import { z } from "zod/v4-mini";

import { Community } from "./Community";
import { Person } from "./Person";

export const CommunityModeratorView = z.object({
  community: Community,
  moderator: Person,
});
