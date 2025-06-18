import { CommunityFollowerView } from "./CommunityFollowerView";
import { CommunityModeratorView } from "./CommunityModeratorView";

export interface SiteResponse {
  version: string;
  site_view: {
    site: {
      name: string;
      description?: string;
      icon?: string;
      banner?: string;
      actor_id: string;
      version?: string;
    };
  };
  my_user?: {
    // local_user_view: LocalUserView;
    follows: Array<CommunityFollowerView>;
    moderates: Array<CommunityModeratorView>;
    // community_blocks: Array<Community>;
    // instance_blocks: Array<Instance>;
    // person_blocks: Array<Person>;
  };
}
