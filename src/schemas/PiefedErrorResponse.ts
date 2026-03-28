import { z } from "zod/v4-mini";

export const PiefedErrorResponse = z.object({
  code: z.number(),
  message: z.string(),
  status: z.string(),
});
