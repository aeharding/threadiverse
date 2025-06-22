import { LemmyHttp } from "lemmy-js-client";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import {
  compatBlocks,
  compatLemmyCommentReportView,
  compatLemmyCommentView,
  compatLemmyCommunityFollowerView,
  compatLemmyCommunityModeratorView,
  compatLemmyCommunityView,
  compatLemmyMentionView,
  compatLemmyModlogView,
  compatLemmyPostReportView,
  compatLemmyPostView,
  compatLemmyReplyView,
} from "./compat";
import {
  InvalidPayloadError,
  UnexpectedResponseError,
  UnsupportedError,
} from "../../errors";
import {
  getInboxItemPublished,
  getLogDate,
  getPostCommentItemCreatedDate,
} from "./helpers";
import { cleanThreadiverseParams } from "../../helpers";

export default class LemmyV0Client implements BaseClient {
  static mode = "lemmyv0" as const;

  static softwareName = "lemmy" as const;

  static softwareVersionRange = ">=0.19.5";

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
    const site = await this.client.getSite(...params);

    return {
      ...site,
      my_user: site.my_user
        ? {
            ...site.my_user,
            follows: site.my_user.follows.map(compatLemmyCommunityFollowerView),
            moderates: site.my_user.moderates.map(
              compatLemmyCommunityModeratorView,
            ),
            ...compatBlocks(site.my_user),
          }
        : undefined,
    };
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
      ...response,
      community_view: {
        ...compatLemmyCommunityView(response.community_view),
      },
      moderators: response.moderators.map(compatLemmyCommunityModeratorView),
    };
  }

  async getPostSortType() {
    return [{ sort: "Top" }, { sort: "All" }] as const;
  }

  async getPosts(
    payload: Parameters<BaseClient["getPosts"]>[0],
    options?: RequestOptions,
  ) {
    if (payload.mode && payload.mode !== "lemmyv0")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const response = await this.client.getPosts(
      cleanThreadiverseParams(payload),
      options,
    );

    return {
      ...response,
      posts: response.posts.map(compatLemmyPostView),
    };
  }

  async getComments(
    payload: Parameters<BaseClient["getComments"]>[0],
    options?: RequestOptions,
  ) {
    if (payload.mode && payload.mode !== "lemmyv0")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const response = await this.client.getComments(
      cleanThreadiverseParams(payload),
      options,
    );

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

  async listCommunities(
    payload: Parameters<BaseClient["listCommunities"]>[0],
    options?: RequestOptions,
  ) {
    if (payload.mode && payload.mode !== "lemmyv0")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const response = await this.client.listCommunities(
      cleanThreadiverseParams(payload),
      options,
    );

    return {
      communities: response.communities.map(compatLemmyCommunityView),
    };
  }

  async search(
    payload: Parameters<BaseClient["search"]>[0],
    options?: RequestOptions,
  ) {
    if (payload.mode && payload.mode !== "lemmyv0")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const response = await this.client.search(
      cleanThreadiverseParams(payload),
      options,
    );

    return {
      ...response,
      comments: response.comments.map(compatLemmyCommentView),
      posts: response.posts.map(compatLemmyPostView),
      communities: response.communities.map(compatLemmyCommunityView),
    };
  }

  async getPersonDetails(
    payload: Parameters<BaseClient["getPersonDetails"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.getPersonDetails(
      {
        ...payload,
        limit: 1, // Lemmy melts down if limit is 0
      },
      options,
    );

    return {
      ...response,
      moderates: response.moderates.map(compatLemmyCommunityModeratorView),
    };
  }

  async listPersonContent(
    payload: Parameters<BaseClient["listPersonContent"]>[0],
    options?: RequestOptions,
  ) {
    const response = await this.client.getPersonDetails(payload, options);

    switch (payload.type) {
      case "All":
      case undefined:
        return {
          content: [
            ...response.posts.map(compatLemmyPostView),
            ...response.comments.map(compatLemmyCommentView),
          ].sort(
            (a, b) =>
              getPostCommentItemCreatedDate(b) -
              getPostCommentItemCreatedDate(a),
          ),
        };
      case "Comments":
        return { content: response.comments.map(compatLemmyCommentView) };
      case "Posts":
        return { content: response.posts.map(compatLemmyPostView) };
    }
  }

  async listPersonSaved(
    payload: Parameters<BaseClient["listPersonSaved"]>[0],
    options?: RequestOptions,
  ) {
    return this.listPersonContent(
      {
        ...payload,
        // @ts-expect-error Dogfood the api
        saved_only: true,
      },
      options,
    );
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

    if (!fileResponse || !response.url) {
      throw new UnexpectedResponseError("Failed to upload image");
    }

    return {
      url: response.url,
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

  async listReports(...params: Parameters<BaseClient["listReports"]>) {
    const [{ comment_reports }, { post_reports }] = await Promise.all([
      this.client.listCommentReports(...params),
      this.client.listPostReports(...params),
    ]);

    return {
      reports: [
        ...comment_reports.map(compatLemmyCommentReportView),
        ...post_reports.map(compatLemmyPostReportView),
      ].sort(
        (a, b) =>
          getPostCommentItemCreatedDate(b) - getPostCommentItemCreatedDate(a),
      ),
    };
  }

  async getModlog(...params: Parameters<BaseClient["getModlog"]>) {
    const response = await this.client.getModlog(...params);

    return {
      modlog: Object.values(response)
        .flat()
        .map(compatLemmyModlogView)
        .sort((a, b) => Date.parse(getLogDate(b)) - Date.parse(getLogDate(a))),
    };
  }

  async getReplies(...params: Parameters<BaseClient["getReplies"]>) {
    const response = await this.client.getReplies(...params);

    return {
      replies: response.replies.map(compatLemmyReplyView),
    };
  }

  async banFromCommunity(
    ...params: Parameters<BaseClient["banFromCommunity"]>
  ) {
    await this.client.banFromCommunity(...params);
  }

  async saveComment(...params: Parameters<BaseClient["saveComment"]>) {
    const response = await this.client.saveComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async distinguishComment(
    ...params: Parameters<BaseClient["distinguishComment"]>
  ) {
    const response = await this.client.distinguishComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async deleteComment(...params: Parameters<BaseClient["deleteComment"]>) {
    const response = await this.client.deleteComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async removeComment(...params: Parameters<BaseClient["removeComment"]>) {
    const response = await this.client.removeComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async followCommunity(...params: Parameters<BaseClient["followCommunity"]>) {
    const response = await this.client.followCommunity(...params);

    return {
      ...response,
      community_view: compatLemmyCommunityView(response.community_view),
    };
  }

  async blockCommunity(...params: Parameters<BaseClient["blockCommunity"]>) {
    const response = await this.client.blockCommunity(...params);

    return {
      ...response,
      community_view: compatLemmyCommunityView(response.community_view),
    };
  }

  async blockPerson(...params: Parameters<BaseClient["blockPerson"]>) {
    return this.client.blockPerson(...params);
  }

  async createPostReport(
    ...params: Parameters<BaseClient["createPostReport"]>
  ) {
    await this.client.createPostReport(...params);
  }

  async createCommentReport(
    ...params: Parameters<BaseClient["createCommentReport"]>
  ) {
    await this.client.createCommentReport(...params);
  }

  async createPrivateMessageReport(
    ...params: Parameters<BaseClient["createPrivateMessageReport"]>
  ) {
    await this.client.createPrivateMessageReport(...params);
  }

  async getSiteMetadata(...params: Parameters<BaseClient["getSiteMetadata"]>) {
    return this.client.getSiteMetadata(...params);
  }

  async resolvePostReport(
    ...params: Parameters<BaseClient["resolvePostReport"]>
  ) {
    await this.client.resolvePostReport(...params);
  }

  async resolveCommentReport(
    ...params: Parameters<BaseClient["resolveCommentReport"]>
  ) {
    await this.client.resolveCommentReport(...params);
  }

  async getRandomCommunity(
    ..._params: Parameters<BaseClient["getRandomCommunity"]>
  ): ReturnType<BaseClient["getRandomCommunity"]> {
    throw new UnsupportedError(
      "Get random community is not supported by Lemmy v0",
    );
  }

  async listPostReports(...params: Parameters<BaseClient["listPostReports"]>) {
    const response = await this.client.listPostReports(...params);

    return {
      post_reports: response.post_reports.map(compatLemmyPostReportView),
    };
  }

  async listCommentReports(
    ...params: Parameters<BaseClient["listCommentReports"]>
  ) {
    const response = await this.client.listCommentReports(...params);

    return {
      comment_reports: response.comment_reports.map(
        compatLemmyCommentReportView,
      ),
    };
  }
}
