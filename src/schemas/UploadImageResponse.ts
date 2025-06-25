import { z } from "zod/v4-mini";

export const UploadImageResponse = z.object({
  url: z.string(),
  delete_token: z.optional(z.string()),
});
