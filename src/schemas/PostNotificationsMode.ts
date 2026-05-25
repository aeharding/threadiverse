import { z } from "zod/v4-mini";

/**
 * Notification setting for a post.
 *
 * - `all_comments`: notify on every new comment on the post.
 * - `replies_and_mentions`: only notify when the user is replied to or
 *   mentioned (this is the default for users who haven't customized).
 * - `mute`: never notify, even for direct replies/mentions on this post.
 */
export const PostNotificationsMode = z.enum([
  "all_comments",
  "replies_and_mentions",
  "mute",
]);
