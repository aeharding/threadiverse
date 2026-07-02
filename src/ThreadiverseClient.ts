import { satisfies } from "compare-versions";

import {
  BaseClient,
  BaseClientOptions,
  ProviderInfo,
  ThreadiverseMode,
} from "./BaseClient";
import { installEndpointMethods } from "./endpoints";
import { UnsupportedSoftwareError } from "./errors";
import LemmyV0Client from "./providers/lemmyv0";
import LemmyV1Client from "./providers/lemmyv1";
import PiefedClient from "./providers/piefed";
import {
  DiscoveryCache,
  Nodeinfo21Payload,
  resolveSoftware,
} from "./wellknown";

export type { DiscoveryCache } from "./wellknown";

// Default (global) cache for software discovery promises by hostname.
// Pass `discoveryCache` in options to scope discovery per client instead
// (e.g. for server-side or test usage).
const globalDiscoveryCache: DiscoveryCache = new Map();

export interface ClientConnection {
  /** Which compat mode the client selected, e.g. `"lemmyv1"` */
  mode: ThreadiverseMode;
  /** The instance's software as reported by nodeinfo */
  software: ProviderInfo;
}

export interface ThreadiverseClientOptions extends BaseClientOptions {
  /**
   * Where to cache software discovery (`.well-known/nodeinfo`) results,
   * keyed by hostname. Defaults to a cache shared by all clients in the
   * process; pass your own `Map` to scope it (server-side, tests).
   */
  discoveryCache?: DiscoveryCache;
}

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
    installEndpointMethods(
      this.prototype,
      (endpoint) =>
        async function (this: ThreadiverseClient, ...params) {
          const client = await this.ensureClient();
          return (
            client[endpoint] as (...params: unknown[]) => Promise<unknown>
          ).apply(client, params);
        },
    );
  }
  /**
   * Which compat mode the client selected. Sync — requires an established
   * connection (`await connect()`, or any resolved API call).
   */
  get mode(): ThreadiverseMode {
    if (!this.delegateClient)
      throw new Error("Client not initialized. Await connect() first");

    return getBaseClientConstructor(this.delegateClient).mode;
  }
  /**
   * The instance's software as reported by nodeinfo. Sync — requires an
   * established connection (`await connect()`, or any resolved API call).
   */
  get software(): ProviderInfo {
    if (
      !this.delegateClient ||
      !getBaseClientConstructor(this.delegateClient).softwareName ||
      !this.discoveredSoftware
    )
      throw new Error("Client not initialized. Await connect() first");

    return {
      name: getBaseClientConstructor(this.delegateClient).softwareName,
      version: this.discoveredSoftware.version,
    };
  }
  private delegateClient: BaseClient | undefined;

  private discoveredSoftware:
    | Awaited<ReturnType<typeof resolveSoftware>>
    | undefined;

  private discoveryCache: DiscoveryCache;

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

  /**
   * Resolve the instance's software (cached nodeinfo discovery) and prepare
   * the underlying provider. Idempotent; after it resolves, the sync `mode`
   * and `software` getters work. Any API call connects implicitly — use
   * this when you need introspection before (or without) making requests.
   */
  async connect(): Promise<ClientConnection> {
    await this.ensureClient();

    return { mode: this.mode, software: this.software };
  }

  /** @deprecated Use `connect()` (or the sync `mode` getter once connected) */
  async getMode(): Promise<ThreadiverseMode> {
    return (await this.connect()).mode;
  }

  /** @deprecated Use `connect()` (or the sync `software` getter once connected) */
  async getSoftware(): Promise<ProviderInfo> {
    return (await this.connect()).software;
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
