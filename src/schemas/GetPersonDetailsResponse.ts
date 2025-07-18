import { z } from "zod/v4-mini";

import { CommunityModeratorView, PersonView } from ".";
/**
 * A person's details response.
 */
export const GetPersonDetailsResponse = z.object({
  // site?: Site;
  moderates: z.array(CommunityModeratorView),
  person_view: PersonView,
});
