import { z } from "zod/v4-mini";

import { CommentView } from "./CommentView";
import { ModlogItem } from "./GetModlogResponse";
import { NotificationDataType } from "./NotificationDataType";
import { PostView } from "./PostView";
import { PrivateMessageView } from "./PrivateMessageView";

export const Notification = z.object({
  comment_id: z.optional(z.number()),
  creator_id: z.number(),
  id: z.number(),
  kind: NotificationDataType,
  modlog_id: z.optional(z.number()),
  post_id: z.optional(z.number()),
  private_message_id: z.optional(z.number()),
  published_at: z.string(),
  read: z.boolean(),
  recipient_id: z.number(),
});

export const NotificationView = z.object({
  data: z.discriminatedUnion("type_", [
    z.extend(CommentView, {
      type_: z.literal("comment"),
    }),
    z.extend(PostView, {
      type_: z.literal("post"),
    }),
    z.extend(PrivateMessageView, {
      type_: z.literal("private_message"),
    }),
    z.extend(ModlogItem, {
      type_: z.literal("mod_action"),
    }),
  ]),
  notification: Notification,
});
