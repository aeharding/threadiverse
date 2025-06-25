import { z } from "zod/v4-mini";

import { Community } from "./Community";
import { CommunityFollowerView } from "./CommunityFollowerView";
import { CommunityModeratorView } from "./CommunityModeratorView";
import { Instance } from "./Instance";
import { Person } from "./Person";
import { PersonAggregates, PersonView } from "./PersonView";
import { RegistrationMode } from "./RegistrationMode";
import { SiteAggregates } from "./SiteAggregates";

export const MyUserInfo = z.object({
  community_blocks: z.array(Community),
  follows: z.array(CommunityFollowerView),
  instance_blocks: z.array(Instance),
  local_user_view: z.object({
    counts: PersonAggregates,
    local_user: z.object({
      admin: z.boolean(),
      show_nsfw: z.boolean(),
    }),
    person: Person,
  }),
  moderates: z.array(CommunityModeratorView),
  person_blocks: z.array(Person),
});

export const LocalSite = z.object({
  /**
   * An optional registration application questionnaire in markdown.
   */
  application_question: z.optional(z.string()),
  captcha_enabled: z.boolean(),
  legal_information: z.optional(z.string()),
  registration_mode: RegistrationMode,
  require_email_verification: z.boolean(),
});

export const Site = z.object({
  actor_id: z.string(),
  banner: z.optional(z.string()),
  description: z.optional(z.string()),
  icon: z.optional(z.string()),
  name: z.string(),
  sidebar: z.optional(z.string()),
  version: z.optional(z.string()),
});

export const SiteView = z.object({
  counts: z.optional(SiteAggregates),
  local_site: LocalSite,
  site: Site,
});

export const GetSiteResponse = z.object({
  admins: z.array(PersonView),
  my_user: z.optional(MyUserInfo),
  site_view: SiteView,
  version: z.string(),
});
