import type { InstanceWithFederationState } from "./InstanceWithFederationState";

/**
 * A list of federated instances.
 */
export interface FederatedInstances {
  linked: InstanceWithFederationState[];
  allowed: InstanceWithFederationState[];
  blocked: InstanceWithFederationState[];
}
