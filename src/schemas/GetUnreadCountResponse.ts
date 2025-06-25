import { z } from "zod/v4-mini";

export const GetUnreadCountResponse = z.object({
  mentions: z.number(),
  private_messages: z.number(),
  replies: z.number(),
});
