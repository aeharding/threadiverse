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
  mod_person_id: z.number(),
  post_id: z.number(),
  locked: z.boolean(),
  when_: z.string(),
});

/**
 * When a moderator features a post on a community (pins it to the top).
 */
export const ModFeaturePost = z.object({
  id: z.number(),
  mod_person_id: z.number(),
  post_id: z.number(),
  featured: z.boolean(),
  when_: z.string(),
  is_featured_community: z.boolean(),
});

/**
 * When a moderator removes a comment.
 */
export const ModRemoveComment = z.object({
  id: z.number(),
  mod_person_id: z.number(),
  comment_id: z.number(),
  reason: z.optional(z.string()),
  removed: z.boolean(),
  when_: z.string(),
});

/**
 * When a moderator removes a community.
 */
export const ModRemoveCommunity = z.object({
  id: z.number(),
  mod_person_id: z.number(),
  community_id: z.number(),
  reason: z.optional(z.string()),
  removed: z.boolean(),
  when_: z.string(),
});

/**
 * When someone is banned from a community.
 */
export const ModBanFromCommunity = z.object({
  id: z.number(),
  mod_person_id: z.number(),
  other_person_id: z.number(),
  community_id: z.number(),
  reason: z.optional(z.string()),
  banned: z.boolean(),
  expires: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When someone is banned from the site.
 */
export const ModBan = z.object({
  id: z.number(),
  mod_person_id: z.number(),
  other_person_id: z.number(),
  reason: z.optional(z.string()),
  banned: z.boolean(),
  expires: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When someone is added as a community moderator.
 */
export const ModAddCommunity = z.object({
  id: z.number(),
  mod_person_id: z.number(),
  other_person_id: z.number(),
  community_id: z.number(),
  removed: z.boolean(),
  when_: z.string(),
});

/**
 * When a moderator transfers a community to a new owner.
 */
export const ModTransferCommunity = z.object({
  id: z.number(),
  mod_person_id: z.number(),
  other_person_id: z.number(),
  community_id: z.number(),
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
  id: z.number(),
  admin_person_id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When an admin purges a community.
 */
export const AdminPurgeCommunity = z.object({
  id: z.number(),
  admin_person_id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When an admin purges a post.
 */
export const AdminPurgePost = z.object({
  id: z.number(),
  admin_person_id: z.number(),
  community_id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When an admin purges a comment.
 */
export const AdminPurgeComment = z.object({
  id: z.number(),
  admin_person_id: z.number(),
  post_id: z.number(),
  reason: z.optional(z.string()),
  when_: z.string(),
});

/**
 * When a community is hidden from public view.
 */
export const ModHideCommunity = z.object({
  id: z.number(),
  community_id: z.number(),
  mod_person_id: z.number(),
  when_: z.string(),
  reason: z.optional(z.string()),
  hidden: z.boolean(),
});

/**
 * When a moderator removes a post.
 */
export const ModRemovePostView = z.object({
  mod_remove_post: ModRemovePost,
  moderator: z.optional(Person),
  post: Post,
  community: Community,
});

/**
 * When a moderator locks a post (prevents new comments being made).
 */
export const ModLockPostView = z.object({
  mod_lock_post: ModLockPost,
  moderator: z.optional(Person),
  post: Post,
  community: Community,
});

/**
 * When a moderator features a post on a community (pins it to the top).
 */
export const ModFeaturePostView = z.object({
  mod_feature_post: ModFeaturePost,
  moderator: z.optional(Person),
  post: Post,
  community: Community,
});

/**
 * When a moderator removes a comment.
 */
export const ModRemoveCommentView = z.object({
  mod_remove_comment: ModRemoveComment,
  moderator: z.optional(Person),
  comment: Comment,
  commenter: Person,
  post: Post,
  community: Community,
});

/**
 * When a moderator removes a community.
 */
export const ModRemoveCommunityView = z.object({
  mod_remove_community: ModRemoveCommunity,
  moderator: z.optional(Person),
  community: Community,
});

/**
 * When someone is banned from a community.
 */
export const ModBanFromCommunityView = z.object({
  mod_ban_from_community: ModBanFromCommunity,
  moderator: z.optional(Person),
  community: Community,
  banned_person: Person,
});

/**
 * When someone is banned from the site.
 */
export const ModBanView = z.object({
  mod_ban: ModBan,
  moderator: z.optional(Person),
  banned_person: Person,
});

/**
 * When someone is added as a community moderator.
 */
export const ModAddCommunityView = z.object({
  mod_add_community: ModAddCommunity,
  moderator: z.optional(Person),
  community: Community,
  modded_person: Person,
});

/**
 * When a moderator transfers a community to a new owner.
 */
export const ModTransferCommunityView = z.object({
  mod_transfer_community: ModTransferCommunity,
  moderator: z.optional(Person),
  community: Community,
  modded_person: Person,
});

/**
 * When someone is added as a site moderator.
 */
export const ModAddView = z.object({
  mod_add: ModAdd,
  moderator: z.optional(Person),
  modded_person: Person,
});

/**
 * When an admin purges a person.
 */
export const AdminPurgePersonView = z.object({
  admin_purge_person: AdminPurgePerson,
  admin: z.optional(Person),
});

/**
 * When an admin purges a community.
 */
export const AdminPurgeCommunityView = z.object({
  admin_purge_community: AdminPurgeCommunity,
  admin: z.optional(Person),
});

/**
 * When an admin purges a post.
 */
export const AdminPurgePostView = z.object({
  admin_purge_post: AdminPurgePost,
  admin: z.optional(Person),
  community: Community,
});

/**
 * When an admin purges a comment.
 */
export const AdminPurgeCommentView = z.object({
  admin_purge_comment: AdminPurgeComment,
  admin: z.optional(Person),
  post: Post,
});

/**
 * When a community is hidden from public view.
 */
export const ModHideCommunityView = z.object({
  mod_hide_community: ModHideCommunity,
  admin: z.optional(Person),
  community: Community,
});

/**
 * The modlog fetch response.
 */
export const GetModlogResponse = z.object({
  modlog: z.array(
    z.union([
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
    ]),
  ),
});
