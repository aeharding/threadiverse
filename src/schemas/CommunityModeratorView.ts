import { Community } from "./Community";
import { Person } from "./Person";
import { z } from "zod/v4-mini";

export const CommunityModeratorView = z.object({
  community: Community,
  moderator: Person,
});
