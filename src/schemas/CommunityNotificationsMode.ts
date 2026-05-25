import { z } from "zod/v4-mini";

/**
 * Notification setting for a community.
 *
 * - `all_posts_and_comments`: notify on every new post and comment in the
 *   community.
 * - `all_posts`: notify on every new post (not comments).
 * - `replies_and_mentions`: only notify when the user is replied to or
 *   mentioned (this is the default for users who haven't customized).
 * - `mute`: never notify, even for direct replies/mentions in this community.
 */
export const CommunityNotificationsMode = z.enum([
  "all_posts_and_comments",
  "all_posts",
  "replies_and_mentions",
  "mute",
]);
