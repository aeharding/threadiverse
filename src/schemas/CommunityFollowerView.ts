import { Community } from "./Community";
import { Person } from "./Person";
import { z } from "zod/v4-mini";

export const CommunityFollowerView = z.object({
  community: Community,
  follower: Person,
});
