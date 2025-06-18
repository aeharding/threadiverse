import { Community } from "./Community";
import { Person } from "./Person";

export interface CommunityModeratorView {
  community: Community;
  moderator: Person;
}
