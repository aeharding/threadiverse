import { z } from "zod/v4-mini";

/**
 * A federated instance / site.
 */
export const Instance = z.object({
  id: z.number(),
  domain: z.string(),
  published: z.string(),
  updated: z.optional(z.string()),
  software: z.optional(z.string()),
  version: z.optional(z.string()),
});
