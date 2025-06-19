import { LemmyHttp } from "lemmy-js-client";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import {
  compatLemmyCommentView,
  compatLemmyCommunityView,
  compatLemmyMentionView,
  compatLemmyPostView,
  compatLemmyReplyView,
} from "./compat";
import { UnexpectedResponseError, UnsupportedError } from "../../errors";
import { getInboxItemPublished } from "./helpers";

export default class LemmyClient implements BaseClient {
  name = "lemmy" as const;

  private client: LemmyHttp;

  constructor(hostname: string, options: BaseClientOptions) {
    this.client = new LemmyHttp(hostname, options);
  }

  async resolveObject(payload: Parameters<BaseClient["resolveObject"]>[0]) {
    const response = await this.client.resolveObject(payload);

    return {
      ...response,
      comment: response.comment
        ? compatLemmyCommentView(response.comment)
        : undefined,
      post: response.post ? compatLemmyPostView(response.post) : undefined,
      community: response.community
        ? compatLemmyCommunityView(response.community)
        : undefined,
    };
  }

  async getSite(...params: Parameters<BaseClient["getSite"]>) {
    return this.client.getSite(...params);
  }

  async login(...params: Parameters<BaseClient["login"]>) {
    return this.client.login(...params);
  }

  async logout(...params: Parameters<BaseClient["logout"]>) {
    await this.client.logout(...params);
  }

  async getCommunity(...params: Parameters<BaseClient["getCommunity"]>) {
    const response = await this.client.getCommunity(...params);

    return {
      community_view: compatLemmyCommunityView(response.community_view),
    };
  }

  async getPosts(...params: Parameters<BaseClient["getPosts"]>) {
    const response = await this.client.getPosts(...params);

    return {
      ...response,
      posts: response.posts.map(compatLemmyPostView),
    };
  }

  async getComments(...params: Parameters<BaseClient["getComments"]>) {
    const response = await this.client.getComments(...params);

    return {
      comments: response.comments.map(compatLemmyCommentView),
    };
  }

  async createPost(...params: Parameters<BaseClient["createPost"]>) {
    const response = await this.client.createPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async editPost(...params: Parameters<BaseClient["editPost"]>) {
    const response = await this.client.editPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async getPost(...params: Parameters<BaseClient["getPost"]>) {
    const response = await this.client.getPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async createComment(...params: Parameters<BaseClient["createComment"]>) {
    const response = await this.client.createComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async editComment(...params: Parameters<BaseClient["editComment"]>) {
    const response = await this.client.editComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async createPrivateMessage(
    ...params: Parameters<BaseClient["createPrivateMessage"]>
  ) {
    return this.client.createPrivateMessage(...params);
  }

  async getUnreadCount(...params: Parameters<BaseClient["getUnreadCount"]>) {
    return this.client.getUnreadCount(...params);
  }

  async getFederatedInstances(
    ...params: Parameters<BaseClient["getFederatedInstances"]>
  ) {
    return this.client.getFederatedInstances(...params);
  }

  async markPostAsRead(...params: Parameters<BaseClient["markPostAsRead"]>) {
    await this.client.markPostAsRead(...params);
  }

  async likePost(...params: Parameters<BaseClient["likePost"]>) {
    const response = await this.client.likePost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async likeComment(...params: Parameters<BaseClient["likeComment"]>) {
    const response = await this.client.likeComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async savePost(...params: Parameters<BaseClient["savePost"]>) {
    const response = await this.client.savePost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async deletePost(...params: Parameters<BaseClient["deletePost"]>) {
    const response = await this.client.deletePost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async removePost(...params: Parameters<BaseClient["removePost"]>) {
    const response = await this.client.removePost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async lockPost(...params: Parameters<BaseClient["lockPost"]>) {
    const response = await this.client.lockPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async featurePost(...params: Parameters<BaseClient["featurePost"]>) {
    const response = await this.client.featurePost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async listCommunities(...params: Parameters<BaseClient["listCommunities"]>) {
    const response = await this.client.listCommunities(...params);

    return {
      communities: response.communities.map(compatLemmyCommunityView),
    };
  }

  async search(...params: Parameters<BaseClient["search"]>) {
    const response = await this.client.search(...params);

    return {
      ...response,
      comments: response.comments.map(compatLemmyCommentView),
      posts: response.posts.map(compatLemmyPostView),
      communities: response.communities.map(compatLemmyCommunityView),
    };
  }

  async getPersonDetails(
    ...params: Parameters<BaseClient["getPersonDetails"]>
  ) {
    const response = await this.client.getPersonDetails(...params);

    return {
      ...response,
      comments: response.comments.map(compatLemmyCommentView),
      posts: response.posts.map(compatLemmyPostView),
    };
  }

  async getNotifications(
    ...params: Parameters<BaseClient["getNotifications"]>
  ) {
    if (params[0].sort !== "New")
      throw new UnsupportedError(
        "Lemmy v0 getNotifications only supports sorting by new",
      );

    const [replies, mentions, privateMessages] = await Promise.all([
      this.client.getReplies(...params),
      this.client.getPersonMentions(...params),
      this.client.getPrivateMessages(...params),
    ]);

    const notifications = [
      ...replies.replies.map(compatLemmyReplyView),
      ...mentions.mentions.map(compatLemmyMentionView),
      ...privateMessages.private_messages,
    ].sort(
      (a, b) =>
        Date.parse(getInboxItemPublished(b)) -
        Date.parse(getInboxItemPublished(a)),
    );

    return {
      notifications,
    };
  }

  async getPersonMentions(
    ...params: Parameters<BaseClient["getPersonMentions"]>
  ) {
    const response = await this.client.getPersonMentions(...params);

    return {
      mentions: response.mentions.map(compatLemmyMentionView),
    };
  }

  async markPersonMentionAsRead(
    ...params: Parameters<BaseClient["markPersonMentionAsRead"]>
  ) {
    await this.client.markPersonMentionAsRead(...params);
  }

  async markPrivateMessageAsRead(
    ...params: Parameters<BaseClient["markPrivateMessageAsRead"]>
  ) {
    await this.client.markPrivateMessageAsRead(...params);
  }

  async markCommentReplyAsRead(
    ...params: Parameters<BaseClient["markCommentReplyAsRead"]>
  ) {
    await this.client.markCommentReplyAsRead(...params);
  }

  async markAllAsRead(...params: Parameters<BaseClient["markAllAsRead"]>) {
    await this.client.markAllAsRead(...params);
  }

  async getPrivateMessages(
    ...params: Parameters<BaseClient["getPrivateMessages"]>
  ) {
    return this.client.getPrivateMessages(...params);
  }

  async saveUserSettings(
    ...params: Parameters<BaseClient["saveUserSettings"]>
  ) {
    await this.client.saveUserSettings(...params);
  }

  async blockInstance(...params: Parameters<BaseClient["blockInstance"]>) {
    await this.client.blockInstance(...params);
  }

  async uploadImage(
    payload: Parameters<BaseClient["uploadImage"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.uploadImage(
      { image: payload.file },
      options,
    );

    const fileResponse = response.files?.[0];

    if (!fileResponse) {
      throw new UnexpectedResponseError("Failed to upload image");
    }

    return {
      url: fileResponse.file,
      delete_token: fileResponse.delete_token,
    };
  }

  async deleteImage(
    payload: Parameters<BaseClient["deleteImage"]>[0],
    options?: RequestOptions,
  ) {
    await this.client.deleteImage(
      { filename: payload.url, token: payload.delete_token },
      options,
    );
  }

  async register(...params: Parameters<BaseClient["register"]>) {
    return this.client.register(...params);
  }

  async getCaptcha(...params: Parameters<BaseClient["getCaptcha"]>) {
    return this.client.getCaptcha(...params);
  }
}
