import { z } from "zod/v4-mini";

import { ReadableFederationState } from "./ReadableFederationState";

export const InstanceWithFederationState = z.object({
  domain: z.string(),
  /**
   * if federation to this instance is or was active, show state of outgoing federation to this
   * instance
   */
  federation_state: z.optional(ReadableFederationState),
  id: z.number(),
  published: z.string(),
  software: z.optional(z.string()),
  updated: z.optional(z.string()),
  version: z.optional(z.string()),
});
