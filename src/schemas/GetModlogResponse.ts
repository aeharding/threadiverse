import { z } from "zod/v4-mini";

import { Comment } from "./Comment";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";

/**
 * When a moderator removes a post.
 */
export const ModRemovePost = z.object({
  id: z.number(),
  mod_person_id: z.number(),
  post_id: z.number(),
  reason: z.optional(z.string()),
  removed: z.boolean(),
  when_: z.string(),
});

/**
 * When a moderator locks a post (prevents new comments being made).
 */
export const ModLockPost = z.object({
  id: z.number(),
  locked: z.boolean(),
  mod_person_id: z.number(),
  post_id: z.number(),
  when_: z.string(),
});

/**
 * When a moderator features a post on a community (pins it to the top).
 */
export const ModFeaturePost = z.object({
  featured: z.boolean(),
  id: z.number(),
  is_featured_community: z.boolean(),
  mod_person_id: z.number(),
  post_id: z.number(),
  when_: z.string(),
});

/**
 * When a moderator removes a comment.
 */
export const ModRemoveComment = z.object({
  comment_id: z.number(),
  id: z.number(),
  mod_person_id: z.number(),
  reason: z.optional(z.string()),
  removed: z.boolean(),
  when_: z.string(),
});

/**
 * When a moderator removes a community.
 */
export const ModRemoveCommunity = z.object({
  community_id: z.number(),
  id: z.number(),
  mod_person_id: z.number(),
  reason: z.optional(z.string()),
  removed: z.boolean(),
  when_: z.string(),
});

/**
 * When someone is banned from a community.
 */
export const ModBanFromCommunity = z.object({
  banned: z.boolean(),
  community_id: z.number(),
  expires: z.optional(z.string()),
  id: z.number(),
  mod_person_id: z.number(),
  other_person_id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When someone is banned from the site.
 */
export const ModBan = z.object({
  banned: z.boolean(),
  expires: z.optional(z.string()),
  id: z.number(),
  mod_person_id: z.number(),
  other_person_id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When someone is added as a community moderator.
 */
export const ModAddCommunity = z.object({
  community_id: z.number(),
  id: z.number(),
  mod_person_id: z.number(),
  other_person_id: z.number(),
  removed: z.boolean(),
  when_: z.string(),
});

/**
 * When a moderator transfers a community to a new owner.
 */
export const ModTransferCommunity = z.object({
  community_id: z.number(),
  id: z.number(),
  mod_person_id: z.number(),
  other_person_id: z.number(),
  when_: z.string(),
});

/**
 * When someone is added as a site moderator.
 */
export const ModAdd = z.object({
  id: z.number(),
  mod_person_id: z.number(),
  other_person_id: z.number(),
  removed: z.boolean(),
  when_: z.string(),
});

/**
 * When an admin purges a person.
 */
export const AdminPurgePerson = z.object({
  admin_person_id: z.number(),
  id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When an admin purges a community.
 */
export const AdminPurgeCommunity = z.object({
  admin_person_id: z.number(),
  id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When an admin purges a post.
 */
export const AdminPurgePost = z.object({
  admin_person_id: z.number(),
  community_id: z.number(),
  id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When an admin purges a comment.
 */
export const AdminPurgeComment = z.object({
  admin_person_id: z.number(),
  id: z.number(),
  post_id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When a community is hidden from public view.
 */
export const ModHideCommunity = z.object({
  community_id: z.number(),
  hidden: z.boolean(),
  id: z.number(),
  mod_person_id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When a moderator removes a post.
 */
export const ModRemovePostView = z.object({
  community: Community,
  mod_remove_post: ModRemovePost,
  moderator: z.optional(Person),
  post: Post,
});

/**
 * When a moderator locks a post (prevents new comments being made).
 */
export const ModLockPostView = z.object({
  community: Community,
  mod_lock_post: ModLockPost,
  moderator: z.optional(Person),
  post: Post,
});

/**
 * When a moderator features a post on a community (pins it to the top).
 */
export const ModFeaturePostView = z.object({
  community: Community,
  mod_feature_post: ModFeaturePost,
  moderator: z.optional(Person),
  post: Post,
});

/**
 * When a moderator removes a comment.
 */
export const ModRemoveCommentView = z.object({
  comment: Comment,
  commenter: Person,
  community: Community,
  mod_remove_comment: ModRemoveComment,
  moderator: z.optional(Person),
  post: Post,
});

/**
 * When a moderator removes a community.
 */
export const ModRemoveCommunityView = z.object({
  community: Community,
  mod_remove_community: ModRemoveCommunity,
  moderator: z.optional(Person),
});

/**
 * When someone is banned from a community.
 */
export const ModBanFromCommunityView = z.object({
  banned_person: Person,
  community: Community,
  mod_ban_from_community: ModBanFromCommunity,
  moderator: z.optional(Person),
});

/**
 * When someone is banned from the site.
 */
export const ModBanView = z.object({
  banned_person: Person,
  mod_ban: ModBan,
  moderator: z.optional(Person),
});

/**
 * When someone is added as a community moderator.
 */
export const ModAddCommunityView = z.object({
  community: Community,
  mod_add_community: ModAddCommunity,
  modded_person: Person,
  moderator: z.optional(Person),
});

/**
 * When a moderator transfers a community to a new owner.
 */
export const ModTransferCommunityView = z.object({
  community: Community,
  mod_transfer_community: ModTransferCommunity,
  modded_person: Person,
  moderator: z.optional(Person),
});

/**
 * When someone is added as a site moderator.
 */
export const ModAddView = z.object({
  mod_add: ModAdd,
  modded_person: Person,
  moderator: z.optional(Person),
});

/**
 * When an admin purges a person.
 */
export const AdminPurgePersonView = z.object({
  admin: z.optional(Person),
  admin_purge_person: AdminPurgePerson,
});

/**
 * When an admin purges a community.
 */
export const AdminPurgeCommunityView = z.object({
  admin: z.optional(Person),
  admin_purge_community: AdminPurgeCommunity,
});

/**
 * When an admin purges a post.
 */
export const AdminPurgePostView = z.object({
  admin: z.optional(Person),
  admin_purge_post: AdminPurgePost,
  community: Community,
});

/**
 * When an admin purges a comment.
 */
export const AdminPurgeCommentView = z.object({
  admin: z.optional(Person),
  admin_purge_comment: AdminPurgeComment,
  post: Post,
});

/**
 * When a community is hidden from public view.
 */
export const ModHideCommunityView = z.object({
  admin: z.optional(Person),
  community: Community,
  mod_hide_community: ModHideCommunity,
});

/**
 * The modlog fetch response.
 */
export const ModlogItem = z.union([
  ModRemovePostView,
  ModLockPostView,
  ModFeaturePostView,
  ModRemoveCommentView,
  ModRemoveCommunityView,
  ModBanFromCommunityView,
  ModBanView,
  ModAddCommunityView,
  ModTransferCommunityView,
  ModAddView,
  AdminPurgePersonView,
  AdminPurgeCommunityView,
  AdminPurgePostView,
  AdminPurgeCommentView,
  ModHideCommunityView,
]);
