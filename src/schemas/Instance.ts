import { z } from "zod/v4-mini";

/**
 * A federated instance / site.
 */
export const Instance = z.object({
  domain: z.string(),
  id: z.number(),
  published_at: z.string(),
  software: z.optional(z.string()),
  updated_at: z.optional(z.string()),
  version: z.optional(z.string()),
});
