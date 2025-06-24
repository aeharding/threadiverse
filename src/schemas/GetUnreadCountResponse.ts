import { z } from "zod/v4-mini";

export const GetUnreadCountResponse = z.object({
  replies: z.number(),
  mentions: z.number(),
  private_messages: z.number(),
});
