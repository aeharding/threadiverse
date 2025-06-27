import { PageParams } from "./PageParams";

/**
 * Fetches the modlog.
 */
export type GetModlog = PageParams & {
  comment_id?: number;
  community_id?: number;
  mod_person_id?: number;
  // TODO: Expose this when lemmy v0 is dropped?
  // type_?: ModlogActionType;
  other_person_id?: number;
  post_id?: number;
};

/**
 * A list of possible types for the various modlog actions.
 */
export type ModlogActionType =
  | "AdminPurgeComment"
  | "AdminPurgeCommunity"
  | "AdminPurgePerson"
  | "AdminPurgePost"
  | "All"
  | "ModAdd"
  | "ModAddCommunity"
  | "ModBan"
  | "ModBanFromCommunity"
  | "ModFeaturePost"
  | "ModHideCommunity"
  | "ModLockPost"
  | "ModRemoveComment"
  | "ModRemoveCommunity"
  | "ModRemovePost"
  | "ModTransferCommunity";
