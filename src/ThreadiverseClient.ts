import { satisfies } from "compare-versions";

import { Nodeinfo21Payload, resolveSoftware } from "./wellknown";
import { BaseClient, BaseClientOptions, ProviderInfo } from "./BaseClient";

import LemmyV0Client from "./providers/lemmyv0";
import PiefedClient from "./providers/piefed";
import LemmyV1Client from "./providers/lemmyv1";
import { UnsupportedSoftwareError } from "./errors";

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

  /**
   * Important: First match wins.
   */
  static get supportedSoftware() {
    return [LemmyV1Client, LemmyV0Client, PiefedClient] as const;
  }

  static resolveClient(software: Nodeinfo21Payload["software"]) {
    for (const Client of ThreadiverseClient.supportedSoftware) {
      if (
        Client.softwareName === software.name &&
        (Client.softwareVersionRange === "*" ||
          satisfies(software.version, Client.softwareVersionRange))
      ) {
        return Client;
      }
    }
  }

  constructor(hostname: string, options: BaseClientOptions) {
    this.hostname = hostname;
    this.options = options;
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
        discoveryCache.set(
          this.hostname,
          resolveSoftware(this.hostname, this.options),
        );
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

  async resolveObject(...params: Parameters<BaseClient["resolveObject"]>) {
    const client = await this.ensureClient();
    return client.resolveObject(...params);
  }

  async getSite(...params: Parameters<BaseClient["getSite"]>) {
    const client = await this.ensureClient();
    return client.getSite(...params);
  }

  async getCommunity(...params: Parameters<BaseClient["getCommunity"]>) {
    const client = await this.ensureClient();
    return client.getCommunity(...params);
  }

  async getPosts(...params: Parameters<BaseClient["getPosts"]>) {
    const client = await this.ensureClient();
    return client.getPosts(...params);
  }

  async getComments(...params: Parameters<BaseClient["getComments"]>) {
    const client = await this.ensureClient();
    return client.getComments(...params);
  }

  async getPost(...params: Parameters<BaseClient["getPost"]>) {
    const client = await this.ensureClient();
    return client.getPost(...params);
  }

  async createPost(...params: Parameters<BaseClient["createPost"]>) {
    const client = await this.ensureClient();
    return client.createPost(...params);
  }

  async editPost(...params: Parameters<BaseClient["editPost"]>) {
    const client = await this.ensureClient();
    return client.editPost(...params);
  }

  async createComment(...params: Parameters<BaseClient["createComment"]>) {
    const client = await this.ensureClient();
    return client.createComment(...params);
  }

  async editComment(...params: Parameters<BaseClient["editComment"]>) {
    const client = await this.ensureClient();
    return client.editComment(...params);
  }

  async login(...params: Parameters<BaseClient["login"]>) {
    const client = await this.ensureClient();
    return client.login(...params);
  }

  async logout(...params: Parameters<BaseClient["logout"]>) {
    const client = await this.ensureClient();
    return client.logout(...params);
  }

  async createPrivateMessage(
    ...params: Parameters<BaseClient["createPrivateMessage"]>
  ) {
    const client = await this.ensureClient();
    return client.createPrivateMessage(...params);
  }

  async getUnreadCount(...params: Parameters<BaseClient["getUnreadCount"]>) {
    const client = await this.ensureClient();
    return client.getUnreadCount(...params);
  }

  async getFederatedInstances(
    ...params: Parameters<BaseClient["getFederatedInstances"]>
  ) {
    const client = await this.ensureClient();
    return client.getFederatedInstances(...params);
  }

  async markPostAsRead(...params: Parameters<BaseClient["markPostAsRead"]>) {
    const client = await this.ensureClient();
    return client.markPostAsRead(...params);
  }

  async likePost(...params: Parameters<BaseClient["likePost"]>) {
    const client = await this.ensureClient();
    return client.likePost(...params);
  }

  async likeComment(...params: Parameters<BaseClient["likeComment"]>) {
    const client = await this.ensureClient();
    return client.likeComment(...params);
  }

  async savePost(...params: Parameters<BaseClient["savePost"]>) {
    const client = await this.ensureClient();
    return client.savePost(...params);
  }

  async deletePost(...params: Parameters<BaseClient["deletePost"]>) {
    const client = await this.ensureClient();
    return client.deletePost(...params);
  }

  async removePost(...params: Parameters<BaseClient["removePost"]>) {
    const client = await this.ensureClient();
    return client.removePost(...params);
  }

  async lockPost(...params: Parameters<BaseClient["lockPost"]>) {
    const client = await this.ensureClient();
    return client.lockPost(...params);
  }

  async featurePost(...params: Parameters<BaseClient["featurePost"]>) {
    const client = await this.ensureClient();
    return client.featurePost(...params);
  }

  async listCommunities(...params: Parameters<BaseClient["listCommunities"]>) {
    const client = await this.ensureClient();
    return client.listCommunities(...params);
  }

  async search(...params: Parameters<BaseClient["search"]>) {
    const client = await this.ensureClient();
    return client.search(...params);
  }

  async getPersonDetails(
    ...params: Parameters<BaseClient["getPersonDetails"]>
  ) {
    const client = await this.ensureClient();
    return client.getPersonDetails(...params);
  }

  async listPersonContent(
    ...params: Parameters<BaseClient["listPersonContent"]>
  ) {
    const client = await this.ensureClient();
    return client.listPersonContent(...params);
  }

  async getNotifications(
    ...params: Parameters<BaseClient["getNotifications"]>
  ) {
    const client = await this.ensureClient();
    return client.getNotifications(...params);
  }

  async getPersonMentions(
    ...params: Parameters<BaseClient["getPersonMentions"]>
  ) {
    const client = await this.ensureClient();
    return client.getPersonMentions(...params);
  }

  async markPersonMentionAsRead(
    ...params: Parameters<BaseClient["markPersonMentionAsRead"]>
  ) {
    const client = await this.ensureClient();
    return client.markPersonMentionAsRead(...params);
  }

  async markPrivateMessageAsRead(
    ...params: Parameters<BaseClient["markPrivateMessageAsRead"]>
  ) {
    const client = await this.ensureClient();
    return client.markPrivateMessageAsRead(...params);
  }

  async markCommentReplyAsRead(
    ...params: Parameters<BaseClient["markCommentReplyAsRead"]>
  ) {
    const client = await this.ensureClient();
    return client.markCommentReplyAsRead(...params);
  }

  async markAllAsRead(...params: Parameters<BaseClient["markAllAsRead"]>) {
    const client = await this.ensureClient();
    return client.markAllAsRead(...params);
  }

  async getPrivateMessages(
    ...params: Parameters<BaseClient["getPrivateMessages"]>
  ) {
    const client = await this.ensureClient();
    return client.getPrivateMessages(...params);
  }

  async saveUserSettings(
    ...params: Parameters<BaseClient["saveUserSettings"]>
  ) {
    const client = await this.ensureClient();
    return client.saveUserSettings(...params);
  }

  async blockInstance(...params: Parameters<BaseClient["blockInstance"]>) {
    const client = await this.ensureClient();
    return client.blockInstance(...params);
  }

  async uploadImage(...params: Parameters<BaseClient["uploadImage"]>) {
    const client = await this.ensureClient();
    return client.uploadImage(...params);
  }

  async deleteImage(...params: Parameters<BaseClient["deleteImage"]>) {
    const client = await this.ensureClient();
    return client.deleteImage(...params);
  }

  async register(...params: Parameters<BaseClient["register"]>) {
    const client = await this.ensureClient();
    return client.register(...params);
  }

  async getCaptcha(...params: Parameters<BaseClient["getCaptcha"]>) {
    const client = await this.ensureClient();
    return client.getCaptcha(...params);
  }

  async listReports(...params: Parameters<BaseClient["listReports"]>) {
    const client = await this.ensureClient();
    return client.listReports(...params);
  }

  async getModlog(...params: Parameters<BaseClient["getModlog"]>) {
    const client = await this.ensureClient();
    return client.getModlog(...params);
  }

  async getReplies(...params: Parameters<BaseClient["getReplies"]>) {
    const client = await this.ensureClient();
    return client.getReplies(...params);
  }

  async banFromCommunity(
    ...params: Parameters<BaseClient["banFromCommunity"]>
  ) {
    const client = await this.ensureClient();
    return client.banFromCommunity(...params);
  }

  async saveComment(...params: Parameters<BaseClient["saveComment"]>) {
    const client = await this.ensureClient();
    return client.saveComment(...params);
  }

  async distinguishComment(
    ...params: Parameters<BaseClient["distinguishComment"]>
  ) {
    const client = await this.ensureClient();
    return client.distinguishComment(...params);
  }

  async deleteComment(...params: Parameters<BaseClient["deleteComment"]>) {
    const client = await this.ensureClient();
    return client.deleteComment(...params);
  }

  async removeComment(...params: Parameters<BaseClient["removeComment"]>) {
    const client = await this.ensureClient();
    return client.removeComment(...params);
  }

  async followCommunity(...params: Parameters<BaseClient["followCommunity"]>) {
    const client = await this.ensureClient();
    return client.followCommunity(...params);
  }

  async blockCommunity(...params: Parameters<BaseClient["blockCommunity"]>) {
    const client = await this.ensureClient();
    return client.blockCommunity(...params);
  }

  async blockPerson(...params: Parameters<BaseClient["blockPerson"]>) {
    const client = await this.ensureClient();
    return client.blockPerson(...params);
  }

  async createPostReport(
    ...params: Parameters<BaseClient["createPostReport"]>
  ) {
    const client = await this.ensureClient();
    return client.createPostReport(...params);
  }

  async createCommentReport(
    ...params: Parameters<BaseClient["createCommentReport"]>
  ) {
    const client = await this.ensureClient();
    return client.createCommentReport(...params);
  }

  async createPrivateMessageReport(
    ...params: Parameters<BaseClient["createPrivateMessageReport"]>
  ) {
    const client = await this.ensureClient();
    return client.createPrivateMessageReport(...params);
  }

  async getSiteMetadata(...params: Parameters<BaseClient["getSiteMetadata"]>) {
    const client = await this.ensureClient();
    return client.getSiteMetadata(...params);
  }

  async resolvePostReport(
    ...params: Parameters<BaseClient["resolvePostReport"]>
  ) {
    const client = await this.ensureClient();
    return client.resolvePostReport(...params);
  }

  async resolveCommentReport(
    ...params: Parameters<BaseClient["resolveCommentReport"]>
  ) {
    const client = await this.ensureClient();
    return client.resolveCommentReport(...params);
  }

  async getRandomCommunity(
    ...params: Parameters<BaseClient["getRandomCommunity"]>
  ) {
    const client = await this.ensureClient();
    return client.getRandomCommunity(...params);
  }

  async listPostReports(...params: Parameters<BaseClient["listPostReports"]>) {
    const client = await this.ensureClient();
    return client.listPostReports(...params);
  }

  async listCommentReports(
    ...params: Parameters<BaseClient["listCommentReports"]>
  ) {
    const client = await this.ensureClient();
    return client.listCommentReports(...params);
  }

  async listPersonSaved(...params: Parameters<BaseClient["listPersonSaved"]>) {
    const client = await this.ensureClient();
    return client.listPersonSaved(...params);
  }
}

export function getBaseClientConstructor(client: BaseClient) {
  return client.constructor as typeof BaseClient;
}
