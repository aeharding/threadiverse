import { Comment } from "./Comment";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";

/**
 * The modlog fetch response.
 */
export type GetModlogResponse = {
  modlog: (
    | ModRemovePostView
    | ModLockPostView
    | ModFeaturePostView
    | ModRemoveCommentView
    | ModRemoveCommunityView
    | ModBanFromCommunityView
    | ModBanView
    | ModAddCommunityView
    | ModTransferCommunityView
    | ModAddView
    | AdminPurgePersonView
    | AdminPurgeCommunityView
    | AdminPurgePostView
    | AdminPurgeCommentView
    | ModHideCommunityView
  )[];
};

/**
 * When a moderator removes a post.
 */
export type ModRemovePostView = {
  mod_remove_post: ModRemovePost;
  moderator?: Person;
  post: Post;
  community: Community;
};

/**
 * When a moderator removes a post.
 */
export type ModRemovePost = {
  id: number;
  mod_person_id: number;
  post_id: number;
  reason?: string;
  removed: boolean;
  when_: string;
};

/**
 * When an admin purges a comment.
 */
export type AdminPurgeCommentView = {
  admin_purge_comment: AdminPurgeComment;
  admin?: Person;
  post: Post;
};

/**
 * When an admin purges a comment.
 */
export type AdminPurgeComment = {
  id: number;
  admin_person_id: number;
  post_id: number;
  reason?: string;
  when_: string;
};

/**
 * When a moderator locks a post (prevents new comments being made).
 */
export type ModLockPostView = {
  mod_lock_post: ModLockPost;
  moderator?: Person;
  post: Post;
  community: Community;
};

/**
 * When a moderator locks a post (prevents new comments being made).
 */
export type ModLockPost = {
  id: number;
  mod_person_id: number;
  post_id: number;
  locked: boolean;
  when_: string;
};

/**
 * When a moderator features a post on a community (pins it to the top).
 */
export type ModFeaturePostView = {
  mod_feature_post: ModFeaturePost;
  moderator?: Person;
  post: Post;
  community: Community;
};

/**
 * When a moderator features a post on a community (pins it to the top).
 */
export type ModFeaturePost = {
  id: number;
  mod_person_id: number;
  post_id: number;
  featured: boolean;
  when_: string;
  is_featured_community: boolean;
};

/**
 * When a moderator removes a comment.
 */
export type ModRemoveCommentView = {
  mod_remove_comment: ModRemoveComment;
  moderator?: Person;
  comment: Comment;
  commenter: Person;
  post: Post;
  community: Community;
};

/**
 * When a moderator removes a comment.
 */
export type ModRemoveComment = {
  id: number;
  mod_person_id: number;
  comment_id: number;
  reason?: string;
  removed: boolean;
  when_: string;
};

/**
 * When a moderator removes a community.
 */
export type ModRemoveCommunityView = {
  mod_remove_community: ModRemoveCommunity;
  moderator?: Person;
  community: Community;
};

/**
 * When a moderator removes a community.
 */
export type ModRemoveCommunity = {
  id: number;
  mod_person_id: number;
  community_id: number;
  reason?: string;
  removed: boolean;
  when_: string;
};

/**
 * When someone is banned from a community.
 */
export type ModBanFromCommunityView = {
  mod_ban_from_community: ModBanFromCommunity;
  moderator?: Person;
  community: Community;
  banned_person: Person;
};

/**
 * When someone is banned from a community.
 */
export type ModBanFromCommunity = {
  id: number;
  mod_person_id: number;
  other_person_id: number;
  community_id: number;
  reason?: string;
  banned: boolean;
  expires?: string;
  when_: string;
};

/**
 * When someone is banned from the site.
 */
export type ModBanView = {
  mod_ban: ModBan;
  moderator?: Person;
  banned_person: Person;
};

/**
 * When someone is banned from the site.
 */
export type ModBan = {
  id: number;
  mod_person_id: number;
  other_person_id: number;
  reason?: string;
  banned: boolean;
  expires?: string;
  when_: string;
};

/**
 * When someone is added as a community moderator.
 */
export type ModAddCommunityView = {
  mod_add_community: ModAddCommunity;
  moderator?: Person;
  community: Community;
  modded_person: Person;
};

/**
 * When someone is added as a community moderator.
 */
export type ModAddCommunity = {
  id: number;
  mod_person_id: number;
  other_person_id: number;
  community_id: number;
  removed: boolean;
  when_: string;
};

/**
 * When a moderator transfers a community to a new owner.
 */
export type ModTransferCommunityView = {
  mod_transfer_community: ModTransferCommunity;
  moderator?: Person;
  community: Community;
  modded_person: Person;
};

/**
 * When a moderator transfers a community to a new owner.
 */
export type ModTransferCommunity = {
  id: number;
  mod_person_id: number;
  other_person_id: number;
  community_id: number;
  when_: string;
};

/**
 * When someone is added as a site moderator.
 */
export type ModAddView = {
  mod_add: ModAdd;
  moderator?: Person;
  modded_person: Person;
};

/**
 * When someone is added as a site moderator.
 */
export type ModAdd = {
  id: number;
  mod_person_id: number;
  other_person_id: number;
  removed: boolean;
  when_: string;
};

/**
 * When an admin purges a person.
 */
export type AdminPurgePersonView = {
  admin_purge_person: AdminPurgePerson;
  admin?: Person;
};

/**
 * When an admin purges a person.
 */
export type AdminPurgePerson = {
  id: number;
  admin_person_id: number;
  reason?: string;
  when_: string;
};

/**
 * When an admin purges a community.
 */
export type AdminPurgeCommunityView = {
  admin_purge_community: AdminPurgeCommunity;
  admin?: Person;
};

/**
 * When an admin purges a community.
 */
export type AdminPurgeCommunity = {
  id: number;
  admin_person_id: number;
  reason?: string;
  when_: string;
};

/**
 * When an admin purges a post.
 */
export type AdminPurgePostView = {
  admin_purge_post: AdminPurgePost;
  admin?: Person;
  community: Community;
};

/**
 * When an admin purges a post.
 */
export type AdminPurgePost = {
  id: number;
  admin_person_id: number;
  community_id: number;
  reason?: string;
  when_: string;
};

/**
 * When a community is hidden from public view.
 */
export type ModHideCommunityView = {
  mod_hide_community: ModHideCommunity;
  admin?: Person;
  community: Community;
};

/**
 * When a community is hidden from public view.
 */
export type ModHideCommunity = {
  id: number;
  community_id: number;
  mod_person_id: number;
  when_: string;
  reason?: string;
  hidden: boolean;
};
