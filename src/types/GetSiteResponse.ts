import { Community } from "./Community";
import { CommunityFollowerView } from "./CommunityFollowerView";
import { CommunityModeratorView } from "./CommunityModeratorView";
import { Instance } from "./Instance";
import { Person } from "./Person";
import { SiteAggregates } from "./SiteAggregates";

export interface GetSiteResponse {
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
    counts?: SiteAggregates;
  };
  my_user?: {
    local_user_view: {
      person: Person;
      local_user: {
        admin: boolean;
        show_nsfw: boolean;
      };
    };
    follows: CommunityFollowerView[];
    moderates: CommunityModeratorView[];
    community_blocks: Community[];
    instance_blocks: Instance[];
    person_blocks: Person[];
  };
}
