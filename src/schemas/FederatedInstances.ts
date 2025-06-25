import { InstanceWithFederationState } from "./InstanceWithFederationState";
import { z } from "zod/v4-mini";

/**
 * A list of federated instances.
 */
export const FederatedInstances = z.object({
  linked: z.array(InstanceWithFederationState),
  allowed: z.array(InstanceWithFederationState),
  blocked: z.array(InstanceWithFederationState),
});
