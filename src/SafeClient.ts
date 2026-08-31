import type { UnsafePiefedClient } from "./providers/piefed";

import { installEndpointMethods } from "./endpoints";
import { UnexpectedResponseError } from "./errors";
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
export default function buildSafeClient<ClientType extends AnyClient>(
  _Client: ClientType,
): ClientType {
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
        if (!schema) return response;

        const result = schema.safeParse(response);
        if (!result.success)
          throw new UnexpectedResponseError(`Malformed ${endpoint} response`, {
            cause: result.error,
          });

        return result.data;
      },
  );

  // The subclass preserves its provider's constructor, instance, and static
  // surface; only endpoint implementations are replaced with validated ones.
  return SafeClient as unknown as ClientType;
}
