import { z } from "zod/v4-mini";

import { InstanceWithFederationState } from "./InstanceWithFederationState";

/**
 * A list of federated instances.
 */
export const FederatedInstances = z.object({
  allowed: z.array(InstanceWithFederationState),
  blocked: z.array(InstanceWithFederationState),
  linked: z.array(InstanceWithFederationState),
});
