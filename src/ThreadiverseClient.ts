import { satisfies } from "compare-versions";

import { BaseClient, BaseClientOptions, ProviderInfo } from "./BaseClient";
import { endpoints } from "./endpoints";
import { UnsupportedSoftwareError } from "./errors";
import LemmyV0Client from "./providers/lemmyv0";
import LemmyV1Client from "./providers/lemmyv1";
import PiefedClient from "./providers/piefed";
import { Nodeinfo21Payload, resolveSoftware } from "./wellknown";

// Default (global) cache for software discovery promises by hostname.
// Pass `discoveryCache` in options to scope discovery per client instead
// (e.g. for server-side or test usage).
const globalDiscoveryCache = new Map<
  string,
  ReturnType<typeof resolveSoftware>
>();

export interface ThreadiverseClientOptions extends BaseClientOptions {
  /**
   * Where to cache software discovery (`.well-known/nodeinfo`) results,
   * keyed by hostname. Defaults to a cache shared by all clients in the
   * process; pass your own `Map` to scope it (server-side, tests).
   */
  discoveryCache?: Map<string, Promise<Nodeinfo21Payload["software"]>>;
}

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

  private discoveryCache: Map<string, ReturnType<typeof resolveSoftware>>;

  private hostname: string;

  private options: BaseClientOptions;

  constructor(hostname: string, options: ThreadiverseClientOptions = {}) {
    this.hostname = hostname;
    this.options = options;
    this.discoveryCache = options.discoveryCache ?? globalDiscoveryCache;
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
      if (!this.discoveryCache.has(this.hostname)) {
        const resolver = resolveSoftware(this.hostname, this.options);
        this.discoveryCache.set(this.hostname, resolver);

        try {
          await resolver;
        } catch (e) {
          this.discoveryCache.delete(this.hostname);
          throw e;
        }
      }
      this.discoveredSoftware = await this.discoveryCache.get(this.hostname)!;
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

// Function to clear the global discovery cache (mainly for testing)
export function clearCache(): void {
  globalDiscoveryCache.clear();
}

export function getBaseClientConstructor(client: BaseClient) {
  return client.constructor as typeof BaseClient;
}
