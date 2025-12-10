import { z } from "zod/v4-mini";

/**
 * A list of possible types for the inbox.
 */
export const NotificationDataType = z.enum([
  "reply",
  "mention",
  "private_message",
  "subscribed",
  "mod_action",
]);
