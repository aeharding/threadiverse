import { ReadableFederationState } from "./ReadableFederationState";

export interface InstanceWithFederationState {
  /**
   * if federation to this instance is or was active, show state of outgoing federation to this
   * instance
   */
  federation_state?: ReadableFederationState;
  id: number;
  domain: string;
  published: string;
  updated?: string;
  software?: string;
  version?: string;
}
