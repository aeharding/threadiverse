import { z } from "zod/v4-mini";

import { Comment } from "./Comment";
import { Community } from "./Community";
import { Person } from "./Person";
import { Post } from "./Post";

export const ModlogKind = z.enum([
  "admin_add",
  "admin_ban",
  "admin_feature_post_site",
  "admin_purge_comment",
  "admin_purge_community",
  "admin_purge_person",
  "admin_purge_post",
  "admin_remove_community",
  "mod_add_to_community",
  "mod_ban_from_community",
  "mod_change_community_visibility",
  "mod_feature_post_community",
  "mod_lock_comment",
  "mod_lock_post",
  "mod_remove_comment",
  "mod_remove_post",
  "mod_transfer_community",
  "mod_warn_comment",
  "mod_warn_post",
]);

export const Modlog = z.object({
  expires_at: z.optional(z.string()),
  id: z.number(),
  is_revert: z.boolean(),
  kind: ModlogKind,
  published_at: z.string(),
  reason: z.optional(z.string()),
});

export const ModlogItem = z.object({
  moderator: z.optional(Person),
  modlog: Modlog,
  target_comment: z.optional(Comment),
  target_community: z.optional(Community),
  target_person: z.optional(Person),
  target_post: z.optional(Post),
});
