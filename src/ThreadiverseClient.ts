import { satisfies } from "compare-versions";

import { BaseClient, BaseClientOptions, ProviderInfo } from "./BaseClient";
import { endpoints } from "./endpoints";
import { UnsupportedSoftwareError } from "./errors";
import LemmyV0Client from "./providers/lemmyv0";
import LemmyV1Client from "./providers/lemmyv1";
import PiefedClient from "./providers/piefed";
import { Nodeinfo21Payload, resolveSoftware } from "./wellknown";

// Global cache for software discovery promises by hostname
// TODO: some way to reset this for server-side/testing usage
const discoveryCache = new Map<string, ReturnType<typeof resolveSoftware>>();

type AnyMethod = (...params: unknown[]) => Promise<unknown>;

/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging --
 * Endpoint methods are installed onto the prototype from the endpoint table
 * (`./endpoints.ts`) in the class's static block; this merged interface
 * declares their types. */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ThreadiverseClient extends BaseClient {}

class ThreadiverseClient {
  /**
   * Important: First match wins.
   */
  static get supportedSoftware() {
    return [LemmyV1Client, LemmyV0Client, PiefedClient] as const;
  }
  static {
    for (const endpoint of Object.keys(endpoints) as (keyof BaseClient)[]) {
      (this.prototype as unknown as Record<string, AnyMethod>)[endpoint] =
        async function (this: ThreadiverseClient, ...params) {
          const client = await this.ensureClient();
          return (client[endpoint] as AnyMethod).apply(client, params);
        };
    }
  }
  get software(): ProviderInfo {
    if (
      !this.delegateClient ||
      !getBaseClientConstructor(this.delegateClient).softwareName ||
      !this.discoveredSoftware
    )
      throw new Error(
        "Client not initialized. Wait for getSoftware() or any other async method to resolve first",
      );

    return {
      name: getBaseClientConstructor(this.delegateClient).softwareName,
      version: this.discoveredSoftware.version,
    };
  }
  private delegateClient: BaseClient | undefined;

  private discoveredSoftware:
    | Awaited<ReturnType<typeof resolveSoftware>>
    | undefined;

  private hostname: string;

  private options: BaseClientOptions;

  constructor(hostname: string, options: BaseClientOptions) {
    this.hostname = hostname;
    this.options = options;
  }

  static resolveClient(software: Nodeinfo21Payload["software"]) {
    for (const Client of ThreadiverseClient.supportedSoftware) {
      if (
        Client.softwareName === software.name &&
        (software.version.startsWith("nightly") ||
          Client.softwareVersionRange === "*" ||
          satisfies(software.version, Client.softwareVersionRange))
      ) {
        return Client;
      }
    }
  }

  async getMode() {
    const client = await this.ensureClient();
    return getBaseClientConstructor(client).mode;
  }

  async getSoftware(): Promise<ProviderInfo> {
    const client = await this.ensureClient();

    if (!this.discoveredSoftware) throw new Error("Internal error");

    return {
      name: getBaseClientConstructor(client).softwareName,
      version: this.discoveredSoftware.version,
    };
  }

  private async ensureClient(): Promise<BaseClient> {
    if (this.delegateClient) {
      return this.delegateClient;
    }

    if (!this.discoveredSoftware) {
      if (!discoveryCache.has(this.hostname)) {
        const resolver = resolveSoftware(this.hostname, this.options);
        discoveryCache.set(this.hostname, resolver);

        try {
          await resolver;
        } catch (e) {
          discoveryCache.delete(this.hostname);
          throw e;
        }
      }
      this.discoveredSoftware = await discoveryCache.get(this.hostname)!;
    }

    const delegateClient = (() => {
      const Client = ThreadiverseClient.resolveClient(this.discoveredSoftware);

      if (!Client) {
        throw new UnsupportedSoftwareError(
          `${this.discoveredSoftware.name} v${this.discoveredSoftware.version} is not supported`,
        );
      }

      return new Client(this.hostname, this.options);
    })();

    this.delegateClient = delegateClient;

    return delegateClient;
  }
}

export default ThreadiverseClient;

// Function to clear the discovery cache (mainly for testing)
export function clearCache(): void {
  discoveryCache.clear();
}

export function getBaseClientConstructor(client: BaseClient) {
  return client.constructor as typeof BaseClient;
}
