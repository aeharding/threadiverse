import { resolveSoftware } from "./wellknown";

import LemmyClient from "./providers/lemmy";
import PiefedClient from "./providers/piefed";
import { BaseClient, BaseClientOptions, ProviderInfo } from "./BaseClient";

// Global cache for software discovery promises by hostname
// TODO: some way to reset this for server-side/testing usage
const discoveryCache = new Map<string, ReturnType<typeof resolveSoftware>>();

// Function to clear the discovery cache (mainly for testing)
export function clearCache(): void {
  discoveryCache.clear();
}

export default class ThreadiverseClient implements BaseClient {
  private hostname: string;
  private options: BaseClientOptions;
  private discoveredSoftware:
    | Awaited<ReturnType<typeof resolveSoftware>>
    | undefined;
  private delegateClient: BaseClient | undefined;

  constructor(hostname: string, options: BaseClientOptions) {
    this.hostname = hostname;
    this.options = options;
  }

  get name() {
    if (!this.delegateClient)
      throw new Error(
        "Client not initialized. Wait for getSoftware() or any other async method to resolve first",
      );

    return this.delegateClient.name;
  }

  get software(): ProviderInfo {
    if (
      !this.delegateClient ||
      !this.delegateClient.name ||
      !this.discoveredSoftware
    )
      throw new Error(
        "Client not initialized. Wait for getSoftware() or any other async method to resolve first",
      );

    return {
      name: this.delegateClient.name,
      version: this.discoveredSoftware.version,
    };
  }

  async getSoftware(): Promise<ProviderInfo> {
    const client = await this.ensureClient();

    if (!this.discoveredSoftware) throw new Error("Internal error");

    return {
      name: client.name,
      version: this.discoveredSoftware.version,
    };
  }

  private async ensureClient(): Promise<BaseClient> {
    if (this.delegateClient) {
      return this.delegateClient;
    }

    if (!this.discoveredSoftware) {
      if (!discoveryCache.has(this.hostname)) {
        discoveryCache.set(
          this.hostname,
          resolveSoftware(this.hostname, this.options),
        );
      }
      this.discoveredSoftware = await discoveryCache.get(this.hostname)!;
    }

    // Create the appropriate client based on discovered software
    switch (this.discoveredSoftware.name) {
      case "lemmy":
        this.delegateClient = new LemmyClient(this.hostname, this.options);
        break;
      case "piefed":
        this.delegateClient = new PiefedClient(this.hostname, this.options);
        break;
      default:
        throw new Error(`Unsupported software: ${this.discoveredSoftware}`);
    }

    return this.delegateClient;
  }

  async resolveObject(payload: Parameters<BaseClient["resolveObject"]>[0]) {
    const client = await this.ensureClient();
    return client.resolveObject(payload);
  }

  async getSite() {
    const client = await this.ensureClient();
    return client.getSite();
  }

  async getCommunity(payload: Parameters<BaseClient["getCommunity"]>[0]) {
    const client = await this.ensureClient();
    return client.getCommunity(payload);
  }

  async getPosts(payload: Parameters<BaseClient["getPosts"]>[0]) {
    const client = await this.ensureClient();
    return client.getPosts(payload);
  }

  async getComments(payload: Parameters<BaseClient["getComments"]>[0]) {
    const client = await this.ensureClient();
    return client.getComments(payload);
  }

  async getPost(payload: Parameters<BaseClient["getPost"]>[0]) {
    const client = await this.ensureClient();
    return client.getPost(payload);
  }

  async createPost(payload: Parameters<BaseClient["createPost"]>[0]) {
    const client = await this.ensureClient();
    return client.createPost(payload);
  }

  async editPost(payload: Parameters<BaseClient["editPost"]>[0]) {
    const client = await this.ensureClient();
    return client.editPost(payload);
  }

  async createComment(payload: Parameters<BaseClient["createComment"]>[0]) {
    const client = await this.ensureClient();
    return client.createComment(payload);
  }

  async editComment(payload: Parameters<BaseClient["editComment"]>[0]) {
    const client = await this.ensureClient();
    return client.editComment(payload);
  }

  async login(payload: Parameters<BaseClient["login"]>[0]) {
    const client = await this.ensureClient();
    return client.login(payload);
  }
}
