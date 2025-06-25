import { z } from "zod/v4-mini";
import { CommunityModeratorView, CommunityView } from ".";

export const GetCommunityResponse = z.object({
  community_view: CommunityView,
  moderators: z.array(CommunityModeratorView),
});
