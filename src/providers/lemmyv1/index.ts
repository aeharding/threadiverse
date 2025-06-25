import {
  CommentReportView as LemmyV1CommentReportView,
  LemmyHttp as LemmyV1Http,
  PersonCommentMentionView as LemmyV1PersonCommentMentionView,
  PostReportView as LemmyV1PostReportView,
  CommentReplyView as LemmyV1CommentReplyView,
  PrivateMessageView as LemmyV1PrivateMessageView,
} from "lemmy-js-client-v1";

import {
  BaseClient,
  BaseClientOptions,
  RequestOptions,
} from "../../BaseClient";
import {
  compatLemmyCommentReportView,
  compatLemmyCommentView,
  compatLemmyCommunityModeratorView,
  compatLemmyCommunityView,
  compatLemmyPersonView,
  compatLemmyPostReportView,
  compatLemmyPostView,
  compatLemmyCommentReplyView,
  compatLemmySiteView,
  compatLemmyReportView,
  compatLemmyPrivateMessageView,
  compatLemmyInboxCombinedView,
  compatLemmyCommentMentionView,
  compatLemmyModlogView,
  compatLemmyFederatedInstances,
} from "./compat";
import { InvalidPayloadError, UnsupportedError } from "../../errors";
import { isPostCommentReport } from "./helpers";
import { cleanThreadiverseParams } from "../../helpers";
import buildSafeClient from "../../SafeClient";

export class UnsafeLemmyV1Client implements BaseClient {
  static mode = "lemmyv1" as const;

  static softwareName = "lemmy" as const;

  static softwareVersionRange = ">=1.0.0-alpha.5";

  #client: LemmyV1Http;

  constructor(hostname: string, options: BaseClientOptions) {
    this.#client = new LemmyV1Http(hostname, options);
  }

  async resolveObject(
    payload: Parameters<BaseClient["resolveObject"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["resolveObject"]> {
    const response = await this.#client.resolveObject(payload, options);

    const compatResponse: Awaited<ReturnType<BaseClient["resolveObject"]>> = {};

    if (response.results.length !== 1) return compatResponse;

    const result = response.results[0];

    switch (result.type_) {
      case "Comment":
        compatResponse.comment = compatLemmyCommentView(result);
        break;
      case "Post":
        compatResponse.post = compatLemmyPostView(result);
        break;
      case "Community":
        compatResponse.community = compatLemmyCommunityView(result);
        break;
      case "Person":
        compatResponse.person = compatLemmyPersonView(result);
    }

    return compatResponse;
  }

  async getSite(
    ...params: Parameters<BaseClient["getSite"]>
  ): ReturnType<BaseClient["getSite"]> {
    const [siteResponse, myUserResponse] = await Promise.all([
      this.#client.getSite(...params),
      this.#client.getHeader("Authorization") &&
        this.#client.getMyUser(...params),
    ]);

    return {
      ...siteResponse,
      ...myUserResponse,
      admins: siteResponse.admins.map(compatLemmyPersonView),
      site_view: compatLemmySiteView(siteResponse.site_view),
    };
  }

  async login(
    ...params: Parameters<BaseClient["login"]>
  ): ReturnType<BaseClient["login"]> {
    return this.#client.login(...params);
  }

  async logout(
    ...params: Parameters<BaseClient["logout"]>
  ): ReturnType<BaseClient["logout"]> {
    await this.#client.logout(...params);
  }

  async getCommunity(
    ...params: Parameters<BaseClient["getCommunity"]>
  ): ReturnType<BaseClient["getCommunity"]> {
    const response = await this.#client.getCommunity(...params);

    return {
      ...response,
      moderators: response.moderators.map(compatLemmyCommunityModeratorView),
      community_view: compatLemmyCommunityView(response.community_view),
    };
  }

  async getPosts(
    payload: Parameters<BaseClient["getPosts"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPosts"]> {
    if (payload.mode && payload.mode !== "lemmyv1")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const response = await this.#client.getPosts(
      cleanThreadiverseParams(payload),
      options,
    );

    return {
      ...response,
      posts: response.posts.map(compatLemmyPostView),
    };
  }

  async getComments(
    ...params: Parameters<BaseClient["getComments"]>
  ): ReturnType<BaseClient["getComments"]> {
    const response = await this.#client.getComments(...params);

    return {
      comments: response.comments.map(compatLemmyCommentView),
    };
  }

  async createPost(
    ...params: Parameters<BaseClient["createPost"]>
  ): ReturnType<BaseClient["createPost"]> {
    const response = await this.#client.createPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async editPost(
    ...params: Parameters<BaseClient["editPost"]>
  ): ReturnType<BaseClient["editPost"]> {
    const response = await this.#client.editPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async getPost(
    ...params: Parameters<BaseClient["getPost"]>
  ): ReturnType<BaseClient["getPost"]> {
    const response = await this.#client.getPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async createComment(
    ...params: Parameters<BaseClient["createComment"]>
  ): ReturnType<BaseClient["createComment"]> {
    const response = await this.#client.createComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async editComment(
    ...params: Parameters<BaseClient["editComment"]>
  ): ReturnType<BaseClient["editComment"]> {
    const response = await this.#client.editComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async createPrivateMessage(
    ...params: Parameters<BaseClient["createPrivateMessage"]>
  ): ReturnType<BaseClient["createPrivateMessage"]> {
    const response = await this.#client.createPrivateMessage(...params);

    return {
      private_message_view: compatLemmyPrivateMessageView(
        response.private_message_view,
      ),
    };
  }

  async getUnreadCount(
    ...params: Parameters<BaseClient["getUnreadCount"]>
  ): ReturnType<BaseClient["getUnreadCount"]> {
    const response = await this.#client.getUnreadCount(...params);

    // TODO: Implement
    return {
      replies: response.count,
      mentions: 0,
      private_messages: 0,
    };
  }

  async getFederatedInstances(
    ...params: Parameters<BaseClient["getFederatedInstances"]>
  ): ReturnType<BaseClient["getFederatedInstances"]> {
    const response = await this.#client.getFederatedInstances(...params);

    return {
      federated_instances: response.federated_instances
        ? compatLemmyFederatedInstances(response.federated_instances)
        : undefined,
    };
  }

  async markPostAsRead(
    ...params: Parameters<BaseClient["markPostAsRead"]>
  ): ReturnType<BaseClient["markPostAsRead"]> {
    await this.#client.markManyPostAsRead(...params);
  }

  async likePost(
    ...params: Parameters<BaseClient["likePost"]>
  ): ReturnType<BaseClient["likePost"]> {
    const response = await this.#client.likePost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async likeComment(
    ...params: Parameters<BaseClient["likeComment"]>
  ): ReturnType<BaseClient["likeComment"]> {
    const response = await this.#client.likeComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async savePost(
    ...params: Parameters<BaseClient["savePost"]>
  ): ReturnType<BaseClient["savePost"]> {
    const response = await this.#client.savePost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async deletePost(
    ...params: Parameters<BaseClient["deletePost"]>
  ): ReturnType<BaseClient["deletePost"]> {
    const response = await this.#client.deletePost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async removePost(
    ...params: Parameters<BaseClient["removePost"]>
  ): ReturnType<BaseClient["removePost"]> {
    const response = await this.#client.removePost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async lockPost(
    ...params: Parameters<BaseClient["lockPost"]>
  ): ReturnType<BaseClient["lockPost"]> {
    const response = await this.#client.lockPost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async featurePost(
    ...params: Parameters<BaseClient["featurePost"]>
  ): ReturnType<BaseClient["featurePost"]> {
    const response = await this.#client.featurePost(...params);

    return {
      post_view: compatLemmyPostView(response.post_view),
    };
  }

  async listCommunities(
    payload: Parameters<BaseClient["listCommunities"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listCommunities"]> {
    if (payload.mode && payload.mode !== "lemmyv1")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const response = await this.#client.listCommunities(
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
  ): ReturnType<BaseClient["search"]> {
    if (payload.mode && payload.mode !== "lemmyv1")
      throw new InvalidPayloadError(
        `Connected to lemmyv1, ${payload.mode} is not supported`,
      );

    const response = await this.#client.search(
      cleanThreadiverseParams(payload),
      options,
    );

    const compatResponse: Awaited<ReturnType<BaseClient["search"]>> = {
      comments: [],
      posts: [],
      communities: [],
      users: [],
    };

    for (const result of response.results) {
      switch (result.type_) {
        case "Comment":
          compatResponse.comments.push(compatLemmyCommentView(result));
          break;
        case "Post":
          compatResponse.posts.push(compatLemmyPostView(result));
          break;
        case "Community":
          compatResponse.communities.push(compatLemmyCommunityView(result));
          break;
        case "Person":
          compatResponse.users.push(compatLemmyPersonView(result));
      }
    }

    return compatResponse;
  }

  async getPersonDetails(
    ...params: Parameters<BaseClient["getPersonDetails"]>
  ): ReturnType<BaseClient["getPersonDetails"]> {
    const response = await this.#client.getPersonDetails(...params);

    return {
      ...response,
      person_view: compatLemmyPersonView(response.person_view),
      moderates: response.moderates.map(compatLemmyCommunityModeratorView),
    };
  }

  async listPersonSaved(
    payload: Parameters<BaseClient["listPersonSaved"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listPersonSaved"]> {
    const response = await this.#client.listPersonSaved(payload, options);

    return {
      ...response,
      content: response.saved.map((item) => {
        if (item.type_ === "Comment") return compatLemmyCommentView(item);
        return compatLemmyPostView(item);
      }),
    };
  }

  async listPersonContent(
    payload: Parameters<BaseClient["listPersonContent"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listPersonContent"]> {
    const response = await this.#client.listPersonContent(payload, options);

    return {
      content: response.content.map((item) => {
        if (item.type_ === "Comment") return compatLemmyCommentView(item);
        return compatLemmyPostView(item);
      }),
    };
  }

  async getNotifications(
    ...params: Parameters<BaseClient["getNotifications"]>
  ): ReturnType<BaseClient["getNotifications"]> {
    const response = await this.#client.listInbox(...params);

    return {
      notifications: response.inbox
        .map(compatLemmyInboxCombinedView)
        .filter((r) => !!r),
    };
  }

  async getPersonMentions(
    payload: Parameters<BaseClient["getPersonMentions"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPersonMentions"]> {
    const response = await this.#client.listInbox(
      {
        ...payload,
        type_: "CommentMention",
      },
      options,
    );

    return {
      // Type set to CommentMention in request, so safe to cast
      mentions: (response.inbox as LemmyV1PersonCommentMentionView[]).map(
        compatLemmyCommentMentionView,
      ),
    };
  }

  async markPersonMentionAsRead(
    payload: Parameters<BaseClient["markPersonMentionAsRead"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["markPersonMentionAsRead"]> {
    await this.#client.markCommentMentionAsRead(
      {
        ...payload,
        person_comment_mention_id: payload.person_mention_id,
      },
      options,
    );
  }

  async markPrivateMessageAsRead(
    ...params: Parameters<BaseClient["markPrivateMessageAsRead"]>
  ): ReturnType<BaseClient["markPrivateMessageAsRead"]> {
    await this.#client.markPrivateMessageAsRead(...params);
  }

  async markCommentReplyAsRead(
    ...params: Parameters<BaseClient["markCommentReplyAsRead"]>
  ): ReturnType<BaseClient["markCommentReplyAsRead"]> {
    await this.#client.markCommentReplyAsRead(...params);
  }

  async markAllAsRead(
    ...params: Parameters<BaseClient["markAllAsRead"]>
  ): ReturnType<BaseClient["markAllAsRead"]> {
    await this.#client.markAllNotificationsAsRead(...params);
  }

  async getPrivateMessages(
    payload: Parameters<BaseClient["getPrivateMessages"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getPrivateMessages"]> {
    const response = await this.#client.listInbox(
      {
        ...payload,
        type_: "PrivateMessage",
      },
      options,
    );

    return {
      // Type set to PrivateMessage in request, so safe to cast
      private_messages: (response.inbox as LemmyV1PrivateMessageView[]).map(
        compatLemmyPrivateMessageView,
      ),
    };
  }

  async saveUserSettings(
    ...params: Parameters<BaseClient["saveUserSettings"]>
  ): ReturnType<BaseClient["saveUserSettings"]> {
    await this.#client.saveUserSettings(...params);
  }

  async blockInstance(
    ...params: Parameters<BaseClient["blockInstance"]>
  ): ReturnType<BaseClient["blockInstance"]> {
    await this.#client.userBlockInstance(...params);
  }

  async uploadImage(
    payload: Parameters<BaseClient["uploadImage"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["uploadImage"]> {
    const response = await this.#client.uploadImage(
      { image: payload.file },
      options,
    );

    return {
      url: response.image_url,
      delete_token: "",
    };
  }

  async deleteImage(
    payload: Parameters<BaseClient["deleteImage"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["deleteImage"]> {
    await this.#client.deleteMedia(
      { filename: payload.url }, // delete_token is not needed. Lemmy verifies account ownership
      options,
    );
  }

  async register(
    ...params: Parameters<BaseClient["register"]>
  ): ReturnType<BaseClient["register"]> {
    return this.#client.register(...params);
  }

  async getCaptcha(
    ...params: Parameters<BaseClient["getCaptcha"]>
  ): ReturnType<BaseClient["getCaptcha"]> {
    return this.#client.getCaptcha(...params);
  }

  async listReports(
    payload: Parameters<BaseClient["listReports"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listReports"]> {
    const response = await this.#client.listReports(payload, options);

    return {
      reports: response.reports
        .filter(isPostCommentReport)
        .map(compatLemmyReportView),
    };
  }

  async getModlog(
    ...params: Parameters<BaseClient["getModlog"]>
  ): ReturnType<BaseClient["getModlog"]> {
    const response = await this.#client.getModlog(...params);

    return {
      modlog: response.modlog.map(compatLemmyModlogView).filter((m) => !!m),
    };
  }

  async getReplies(
    payload: Parameters<BaseClient["getReplies"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["getReplies"]> {
    const response = await this.#client.listInbox(
      {
        ...payload,
        type_: "CommentReply",
      },
      options,
    );

    return {
      replies: (response.inbox as LemmyV1CommentReplyView[]).map(
        compatLemmyCommentReplyView,
      ),
    };
  }

  async banFromCommunity(
    ...params: Parameters<BaseClient["banFromCommunity"]>
  ): ReturnType<BaseClient["banFromCommunity"]> {
    await this.#client.banFromCommunity(...params);
  }

  async saveComment(
    ...params: Parameters<BaseClient["saveComment"]>
  ): ReturnType<BaseClient["saveComment"]> {
    const response = await this.#client.saveComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async distinguishComment(
    ...params: Parameters<BaseClient["distinguishComment"]>
  ): ReturnType<BaseClient["distinguishComment"]> {
    const response = await this.#client.distinguishComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async deleteComment(
    ...params: Parameters<BaseClient["deleteComment"]>
  ): ReturnType<BaseClient["deleteComment"]> {
    const response = await this.#client.deleteComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async removeComment(
    ...params: Parameters<BaseClient["removeComment"]>
  ): ReturnType<BaseClient["removeComment"]> {
    const response = await this.#client.removeComment(...params);

    return {
      comment_view: compatLemmyCommentView(response.comment_view),
    };
  }

  async followCommunity(
    ...params: Parameters<BaseClient["followCommunity"]>
  ): ReturnType<BaseClient["followCommunity"]> {
    const response = await this.#client.followCommunity(...params);

    return {
      community_view: compatLemmyCommunityView(response.community_view),
    };
  }

  async blockCommunity(
    ...params: Parameters<BaseClient["blockCommunity"]>
  ): ReturnType<BaseClient["blockCommunity"]> {
    const response = await this.#client.blockCommunity(...params);

    return {
      ...response,
      community_view: compatLemmyCommunityView(response.community_view),
    };
  }

  async blockPerson(
    ...params: Parameters<BaseClient["blockPerson"]>
  ): ReturnType<BaseClient["blockPerson"]> {
    const response = await this.#client.blockPerson(...params);

    return {
      ...response,
      person_view: compatLemmyPersonView(response.person_view),
    };
  }

  async createPostReport(
    ...params: Parameters<BaseClient["createPostReport"]>
  ): ReturnType<BaseClient["createPostReport"]> {
    await this.#client.createPostReport(...params);
  }

  async createCommentReport(
    ...params: Parameters<BaseClient["createCommentReport"]>
  ): ReturnType<BaseClient["createCommentReport"]> {
    await this.#client.createCommentReport(...params);
  }

  async createPrivateMessageReport(
    ...params: Parameters<BaseClient["createPrivateMessageReport"]>
  ): ReturnType<BaseClient["createPrivateMessageReport"]> {
    await this.#client.createPrivateMessageReport(...params);
  }

  async getSiteMetadata(
    ...params: Parameters<BaseClient["getSiteMetadata"]>
  ): ReturnType<BaseClient["getSiteMetadata"]> {
    return this.#client.getSiteMetadata(...params);
  }

  async resolvePostReport(
    ...params: Parameters<BaseClient["resolvePostReport"]>
  ): ReturnType<BaseClient["resolvePostReport"]> {
    await this.#client.resolvePostReport(...params);
  }

  async resolveCommentReport(
    ...params: Parameters<BaseClient["resolveCommentReport"]>
  ): ReturnType<BaseClient["resolveCommentReport"]> {
    await this.#client.resolveCommentReport(...params);
  }

  async getRandomCommunity(
    ..._params: Parameters<BaseClient["getRandomCommunity"]>
  ): ReturnType<BaseClient["getRandomCommunity"]> {
    throw new UnsupportedError(
      "Get random community is not supported by Lemmy v0",
    );
  }

  async listPostReports(
    payload: Parameters<BaseClient["listPostReports"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listPostReports"]> {
    const response = await this.#client.listReports(
      {
        ...payload,
        type_: "Posts",
      },
      options,
    );

    return {
      // Type set to Posts in request, so safe to cast
      post_reports: (response.reports as LemmyV1PostReportView[]).map(
        compatLemmyPostReportView,
      ),
    };
  }

  async listCommentReports(
    payload: Parameters<BaseClient["listCommentReports"]>[0],
    options?: RequestOptions,
  ): ReturnType<BaseClient["listCommentReports"]> {
    const response = await this.#client.listReports(
      {
        ...payload,
        type_: "Comments",
      },
      options,
    );

    return {
      // Type set to Comments in request, so safe to cast
      comment_reports: (response.reports as LemmyV1CommentReportView[]).map(
        compatLemmyCommentReportView,
      ),
    };
  }
}

export default buildSafeClient(UnsafeLemmyV1Client);
