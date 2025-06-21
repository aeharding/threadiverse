/**
 * Fetches the modlog.
 */
export type GetModlog = {
  mod_person_id?: number;
  community_id?: number;
  page?: number;
  limit?: number;
  type_?: ModlogActionType;
  other_person_id?: number;
  post_id?: number;
  comment_id?: number;
};

/**
 * A list of possible types for the various modlog actions.
 */
export type ModlogActionType =
  | "All"
  | "ModRemovePost"
  | "ModLockPost"
  | "ModFeaturePost"
  | "ModRemoveComment"
  | "ModRemoveCommunity"
  | "ModBanFromCommunity"
  | "ModAddCommunity"
  | "ModTransferCommunity"
  | "ModAdd"
  | "ModBan"
  | "ModHideCommunity"
  | "AdminPurgePerson"
  | "AdminPurgeCommunity"
  | "AdminPurgePost"
  | "AdminPurgeComment";
