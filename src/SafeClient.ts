import type { UnsafePiefedClient } from "./providers/piefed";

import { installEndpointMethods } from "./endpoints";
import { UnsafeLemmyV0Client } from "./providers/lemmyv0";
import { UnsafeLemmyV1Client } from "./providers/lemmyv1";

type AnyClient =
  | typeof UnsafeLemmyV0Client
  | typeof UnsafeLemmyV1Client
  | typeof UnsafePiefedClient;

/**
 * Wraps a provider class so that every endpoint's response is validated
 * against the canonical Zod schema declared in the endpoint table
 * (`./endpoints.ts`) before being returned to the consumer.
 */
export default function buildSafeClient(_Client: AnyClient): AnyClient {
  // Typescript is not smart enough to infer the correct type from the union
  // Since they all implement BaseClient, cast to the first one
  const Client = _Client as typeof UnsafeLemmyV0Client;

  class SafeClient extends Client {}

  installEndpointMethods(
    SafeClient.prototype,
    (endpoint, schema) =>
      async function (this: InstanceType<AnyClient>, ...params) {
        // Resolved at call time (like `super.<endpoint>()` would be)
        const unsafeMethod = Client.prototype[endpoint] as (
          ...params: unknown[]
        ) => Promise<unknown>;

        const response = await unsafeMethod.apply(this, params);
        return schema ? schema.parse(response) : response;
      },
  );

  return SafeClient;
}
