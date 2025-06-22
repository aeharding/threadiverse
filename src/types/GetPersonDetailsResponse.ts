import type { CommunityModeratorView } from "./CommunityModeratorView";
import type { PersonView } from "./PersonView";
/**
 * A person's details response.
 */
export type GetPersonDetailsResponse = {
  person_view: PersonView;
  // site?: Site;
  moderates: Array<CommunityModeratorView>;
};
