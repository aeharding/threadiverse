import { ReadableFederationState } from "./ReadableFederationState";
import { z } from "zod/v4-mini";

export const InstanceWithFederationState = z.object({
  /**
   * if federation to this instance is or was active, show state of outgoing federation to this
   * instance
   */
  federation_state: z.optional(ReadableFederationState),
  id: z.number(),
  domain: z.string(),
  published: z.string(),
  updated: z.optional(z.string()),
  software: z.optional(z.string()),
  version: z.optional(z.string()),
});
