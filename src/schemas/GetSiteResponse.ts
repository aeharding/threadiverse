import { z } from "zod/v4-mini";
import { PersonAggregates, PersonView } from "./PersonView";
import { Person } from "./Person";
import { CommunityModeratorView } from "./CommunityModeratorView";
import { Community } from "./Community";
import { CommunityFollowerView } from "./CommunityFollowerView";
import { Instance } from "./Instance";
import { SiteAggregates } from "./SiteAggregates";
import { RegistrationMode } from "./RegistrationMode";

export const MyUserInfo = z.object({
  local_user_view: z.object({
    person: Person,
    counts: PersonAggregates,
    local_user: z.object({
      admin: z.boolean(),
      show_nsfw: z.boolean(),
    }),
  }),
  follows: z.array(CommunityFollowerView),
  moderates: z.array(CommunityModeratorView),
  community_blocks: z.array(Community),
  instance_blocks: z.array(Instance),
  person_blocks: z.array(Person),
});

export const LocalSite = z.object({
  require_email_verification: z.boolean(),
  captcha_enabled: z.boolean(),
  /**
   * An optional registration application questionnaire in markdown.
   */
  application_question: z.optional(z.string()),
  registration_mode: RegistrationMode,
  legal_information: z.optional(z.string()),
});

export const Site = z.object({
  name: z.string(),
  description: z.optional(z.string()),
  icon: z.optional(z.string()),
  banner: z.optional(z.string()),
  actor_id: z.string(),
  version: z.optional(z.string()),
  sidebar: z.optional(z.string()),
});

export const SiteView = z.object({
  site: Site,
  local_site: LocalSite,
  counts: z.optional(SiteAggregates),
});

export const GetSiteResponse = z.object({
  version: z.string(),
  admins: z.array(PersonView),
  site_view: SiteView,
  my_user: z.optional(MyUserInfo),
});
