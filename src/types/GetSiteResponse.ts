import { Community } from "./Community";
import { CommunityFollowerView } from "./CommunityFollowerView";
import { CommunityModeratorView } from "./CommunityModeratorView";
import { Instance } from "./Instance";
import { Person } from "./Person";
import { PersonView } from "./PersonView";
import { RegistrationMode } from "./RegistrationMode";
import { SiteAggregates } from "./SiteAggregates";

export interface GetSiteResponse {
  version: string;
  admins: PersonView[];
  site_view: SiteView;
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

export interface SiteView {
  site: Site;
  local_site: LocalSite;
  counts?: SiteAggregates;
}

export interface Site {
  name: string;
  description?: string;
  icon?: string;
  banner?: string;
  actor_id: string;
  version?: string;
  sidebar?: string;
}

export interface LocalSite {
  require_email_verification: boolean;
  captcha_enabled: boolean;
  /**
   * An optional registration application questionnaire in markdown.
   */
  application_question?: string;
  registration_mode: RegistrationMode;
  legal_information?: string;
}
