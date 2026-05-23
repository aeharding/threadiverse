import { z } from "zod/v4-mini";

import { Community } from "./Community";
import { CommunityFollowerView } from "./CommunityFollowerView";
import { CommunityModeratorView } from "./CommunityModeratorView";
import { Instance } from "./Instance";
import { Person } from "./Person";
import { PersonView } from "./PersonView";
import { RegistrationMode } from "./RegistrationMode";

export const MyUserInfo = z.object({
  community_blocks: z.array(Community),
  follows: z.array(CommunityFollowerView),
  instance_blocks: z.array(Instance),
  local_user_view: z.object({
    local_user: z.object({
      admin: z.boolean(),
      show_nsfw: z.boolean(),
    }),
    person: Person,
  }),
  moderates: z.array(CommunityModeratorView),
  person_blocks: z.array(Person),
});

export const FederationMode = z.enum(["all", "local", "disable"]);

export const LocalSite = z.object({
  /**
   * An optional registration application questionnaire in markdown.
   */
  application_question: z.optional(z.string()),
  captcha_enabled: z.boolean(),
  /**
   * What kind of comment downvotes your site allows.
   */
  comment_downvotes: FederationMode,
  /**
   * What kind of comment upvotes your site allows.
   */
  comment_upvotes: FederationMode,
  comments: z.number(),
  communities: z.number(),
  email_verification_required: z.boolean(),
  legal_information: z.optional(z.string()),
  /**
   * What kind of post downvotes your site allows.
   */
  post_downvotes: FederationMode,
  /**
   * What kind of post upvotes your site allows.
   */
  post_upvotes: FederationMode,
  posts: z.number(),
  registration_mode: RegistrationMode,
  users: z.number(),
  users_active_day: z.number(),
  users_active_half_year: z.number(),
  users_active_month: z.number(),
  users_active_week: z.number(),
});

export const Site = z.object({
  /**
   * The federated activity id / ap_id.
   */
  ap_id: z.string(),
  banner: z.optional(z.string()),
  icon: z.optional(z.string()),
  name: z.string(),
  /**
   * Long-form sidebar markdown.
   */
  sidebar: z.optional(z.string()),
  /**
   * Short one-line summary.
   */
  summary: z.optional(z.string()),
});

export const SiteView = z.object({
  local_site: LocalSite,
  site: Site,
});

export const GetSiteResponse = z.object({
  admins: z.array(PersonView),
  my_user: z.optional(MyUserInfo),
  site_view: SiteView,
  version: z.string(),
});
