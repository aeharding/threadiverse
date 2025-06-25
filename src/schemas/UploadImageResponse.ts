import { z } from "zod/v4-mini";

export const UploadImageResponse = z.object({
  delete_token: z.optional(z.string()),
  url: z.string(),
});
